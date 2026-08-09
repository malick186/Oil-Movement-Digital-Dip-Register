import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function PageTransition({ page, children }: { page: string; children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(children);
  const [animClass, setAnimClass] = useState('');
  const prevPage = useRef(page);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      setContent(children);
      mounted.current = true;
      prevPage.current = page;
      return;
    }

    if (prevPage.current === page) {
      setContent(children);
      return;
    }

    prevPage.current = page;

    const swap = () => {
      setContent(children);
      setAnimClass('page-enter');
    };

    const supportsVT = 'startViewTransition' in document;

    if (supportsVT) {
      setAnimClass('page-exit');
      (document as any).startViewTransition(() => {
        swap();
      });
    } else {
      setAnimClass('page-exit');
      const timer = setTimeout(() => {
        swap();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [page, children]);

  return <div className={animClass}>{content}</div>;
}
