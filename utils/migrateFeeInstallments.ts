// Lazily migrates legacy school profiles (paymentPlans + FeeGroup.paymentPlanId +
// ScheduledFee.dueInstallmentId) to the per-fee installments model:
//
//   financialConfig.installments        → global Installment catalog (deduped by id)
//   ScheduledFee.installments           → per-fee split entries referencing Installment.id
//   FeeGroup.paymentPlanId              → removed
//   financialConfig.paymentPlans        → removed
//
// Idempotent: profiles already using the new shape pass through unchanged.

type Mutable = { [key: string]: any };

interface LegacyInstallment {
	id?: string;
	label?: string;
	dueWindow?: string;
	percentage?: number | string | null;
	fixedAmount?: { amount: number; currency: string };
}

interface LegacyPlan {
	id?: string;
	installments?: LegacyInstallment[];
}

export const migrateSchoolProfileToInstallments = <T>(profile: T): T => {
	if (!profile || typeof profile !== 'object') return profile;
	const fc = (profile as Mutable).financialConfig as Mutable | undefined;
	if (!fc || typeof fc !== 'object') return profile;

	// Already migrated.
	if (Array.isArray(fc.installments) && !Array.isArray(fc.paymentPlans)) {
		return profile;
	}

	const plans: LegacyPlan[] = Array.isArray(fc.paymentPlans)
		? (fc.paymentPlans as LegacyPlan[])
		: [];

	// Promote all plan installments into a global, order-preserving, deduped catalog.
	const catalog = new Map<string, LegacyInstallment>();
	for (const plan of plans) {
		for (const inst of plan?.installments ?? []) {
			if (!inst?.id) continue;
			if (!catalog.has(inst.id)) {
				catalog.set(inst.id, {
					id: inst.id,
					label: inst.label || inst.id,
					dueWindow: inst.dueWindow || '',
				});
			}
		}
	}

	const schedules = Array.isArray(fc.feeSchedules) ? (fc.feeSchedules as Mutable[]) : [];
	for (const schedule of schedules) {
		for (const sfs of schedule?.sessionFeeSchedules ?? []) {
			for (const fg of sfs?.feeGroups ?? []) {
				if (fg && 'paymentPlanId' in fg) delete fg.paymentPlanId;
				for (const sf of fg?.scheduledFees ?? []) {
					if (!sf || typeof sf !== 'object') continue;
					if ('dueInstallmentId' in sf) {
						const legacyId = sf.dueInstallmentId;
						if (legacyId) {
							const plan = plans.find((p) => p?.id === fg?.paymentPlanId);
							const legacyInst = plan?.installments?.find(
								(i) => i.id === legacyId,
							);
							const entry: Mutable = { installmentId: legacyId };
							if (
								legacyInst?.percentage != null &&
								String(legacyInst.percentage).trim() !== ''
							) {
								entry.percentage = Number(legacyInst.percentage);
							} else if (legacyInst?.fixedAmount?.amount != null) {
								entry.fixedAmount = legacyInst.fixedAmount;
							} else {
								// Fee was due in full at this single installment.
								entry.percentage = 1;
							}
							sf.installments = [entry];
						} else {
							// Null legacy value = due immediately.
							sf.installments = [];
						}
						delete sf.dueInstallmentId;
					}
					if (!Array.isArray(sf.installments)) {
						sf.installments = [];
					}
				}
			}
		}
	}

	fc.installments = Array.from(catalog.values());
	delete fc.paymentPlans;

	return profile;
};
