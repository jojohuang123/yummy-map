export const withTimeout = async (promiseFactory, timeoutMs, timeoutErrorFactory) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw timeoutErrorFactory();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export const mapWithConcurrency = async (items, worker, concurrency = 3) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const run = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
};
