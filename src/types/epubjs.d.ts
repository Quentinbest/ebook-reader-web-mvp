declare module "epubjs" {
  type Location = {
    start: {
      cfi: string;
    };
  };

  interface Rendition {
    display(target?: string): Promise<void>;
    prev(): void;
    next(): void;
    themes: {
      default(styles: unknown): void;
      select(name: string): void;
      register(name: string, styles: unknown): void;
    };
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    currentLocation(): Location | Location[] | null;
    annotations: {
      add(type: string, cfiRange: string, data: unknown, cb: unknown, className: string, styles: Record<string, string>): void;
      remove(cfiRange: string, type: string): void;
    };
  }

  interface Book {
    ready: Promise<void>;
    locations: {
      generate(chars: number): Promise<void>;
      percentageFromCfi(cfi: string): number;
      cfiFromPercentage(percent: number): string;
    };
    navigation: {
      toc: Array<{ href: string; label: string }>;
    };
    renderTo(element: HTMLElement, options: Record<string, unknown>): Rendition;
    destroy(): void;
  }

  function ePub(input: ArrayBuffer | string | Blob): Book;
  export default ePub;
}
