export type ToastFn = (message: string, duration?: number) => void;

/** 轻提示：同一时间只显示一条，重复调用会重置计时。 */
export function createToast(host: HTMLElement): ToastFn {
  let timer: number | undefined;
  return (message, duration = 2400) => {
    host.textContent = message;
    host.classList.add('is-visible');
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => host.classList.remove('is-visible'), duration);
  };
}
