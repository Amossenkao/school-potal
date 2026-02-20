type ScrollLockState = {
	count: number;
	bodyOverflow: string;
	htmlOverflow: string;
};

type ScrollLockWindow = Window & {
	__schoolPortalScrollLockState?: ScrollLockState;
};

const getScrollLockState = (): ScrollLockState => {
	const win = window as ScrollLockWindow;
	if (!win.__schoolPortalScrollLockState) {
		win.__schoolPortalScrollLockState = {
			count: 0,
			bodyOverflow: '',
			htmlOverflow: '',
		};
	}
	return win.__schoolPortalScrollLockState;
};

export const lockBodyScroll = () => {
	const state = getScrollLockState();

	if (state.count === 0) {
		state.bodyOverflow = document.body.style.overflow;
		state.htmlOverflow = document.documentElement.style.overflow;
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
	}

	state.count += 1;
	let released = false;

	return () => {
		if (released) return;
		released = true;

		state.count = Math.max(0, state.count - 1);
		if (state.count > 0) return;

		document.body.style.overflow = state.bodyOverflow;
		document.documentElement.style.overflow = state.htmlOverflow;
		state.bodyOverflow = '';
		state.htmlOverflow = '';
	};
};
