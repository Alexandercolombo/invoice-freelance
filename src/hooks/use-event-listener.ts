import { useEffect, useRef } from 'react';

type EventHandler<T extends Event> = (event: T) => void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: EventHandler<WindowEventMap[K]>,
  element: Window | HTMLElement | null = window,
  options?: boolean | AddEventListenerOptions
) {
  // Create a ref that stores handler
  const savedHandler = useRef<EventHandler<WindowEventMap[K]>>();

  useEffect(() => {
    // Define the listening target
    if (!element) return;

    // Update saved handler if necessary
    savedHandler.current = handler;

    // Create event listener that calls handler function stored in ref
    const eventListener: EventHandler<WindowEventMap[K]> = (event) => {
      if (savedHandler.current) {
        savedHandler.current(event);
      }
    };

    // Add event listener
    element.addEventListener(eventName, eventListener as EventListener, options);

    // Remove event listener on cleanup
    return () => {
      element.removeEventListener(eventName, eventListener as EventListener, options);
    };
  }, [eventName, element, options]); // Re-run if eventName or element changes
} 