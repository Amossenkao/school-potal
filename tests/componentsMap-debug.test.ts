import { describe, it, expect } from 'vitest';
import {
	validateComponentAccess,
	generateDynamicComponentsMap,
} from '@/utils/componentsMap';
import profile from '../profile.json';

describe('debug componentsMap', () => {
	it('imports', () => {
		expect(validateComponentAccess).toBeDefined();
	});

	it('grants clearances to admin holding financial_clearance when enabled', () => {
		const school: any = JSON.parse(JSON.stringify(profile));
		school.featureConfig.enabledFeatures.push('financial_clearance');
		const result = validateComponentAccess(
			school,
			'administrator',
			'clearances',
			['financial_clearance'],
			false,
		);
		console.log('RESULT', result);
		expect(result).toBe(true);
	});

	it('denies clearances when enabledFeatures lacks financial_clearance', () => {
		const school: any = JSON.parse(JSON.stringify(profile));
		school.featureConfig.enabledFeatures = school.featureConfig.enabledFeatures.filter(
			(f: string) => f !== 'financial_clearance',
		);
		const result = validateComponentAccess(
			school,
			'administrator',
			'clearances',
			['financial_clearance'],
			false,
		);
		console.log('RESULT2', result);
		expect(result).toBe(false);
	});

	it('includes clearances in dynamic map when enabled', () => {
		const school: any = JSON.parse(JSON.stringify(profile));
		school.featureConfig.enabledFeatures.push('financial_clearance');
		const map = generateDynamicComponentsMap(
			school,
			'administrator',
			['financial_clearance'],
			false,
		);
		console.log(
			'MAP KEYS',
			Object.keys(map['administrator']?.items || {}),
			Object.keys(map.shared?.items || {}),
		);
		expect(map['administrator']?.items?.['clearances']).toBeDefined();
	});
});
