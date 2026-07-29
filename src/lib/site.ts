export const SITE_URL = "https://tedbirge-gateway.lovable.app";

export function siteUrl(path = "/") {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
