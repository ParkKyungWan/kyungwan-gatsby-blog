import React from 'react';
import siteMetadata from '../../gatsby-site-meta-data';
export const graphql = () => '';
export const useStaticQuery = () => ({ site: { siteMetadata } });
export const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; activeClassName?: string }
>(function Link({ to, activeClassName, ...props }, ref) {
  return <a {...props} ref={ref} href={to} />;
});
