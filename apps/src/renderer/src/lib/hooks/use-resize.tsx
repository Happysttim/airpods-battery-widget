import { useEffect, useRef } from 'react';

const useResize = (type: 'widget' | 'list') => {
  const resize = (height: number) => {
    window.backend.resizeToContent(height, type);
  };

  const observer = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      if (!ref.current) {
        return;
      }
      const height = ref.current.offsetHeight;
      resize(height);
    });
  });

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return ref;
};

export default useResize;
