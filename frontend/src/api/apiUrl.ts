export const getAPIURL = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return ensureTrailingSlash(apiUrl);
};

const ensureTrailingSlash = (url: string): string => {
  if (url.lastIndexOf('/') !== url.length - 1) {
    return url + '/';
  }
  return url;
};
