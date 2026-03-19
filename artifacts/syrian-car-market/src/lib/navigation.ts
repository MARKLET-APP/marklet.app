type NavigateFn = (to: string, opts?: { replace?: boolean }) => void;

let _navigate: NavigateFn = (path) => {
  window.location.href = path;
};

export function setGlobalNavigate(fn: NavigateFn) {
  _navigate = fn;
}

export function globalNavigate(path: string, opts?: { replace?: boolean }) {
  _navigate(path, opts);
}
