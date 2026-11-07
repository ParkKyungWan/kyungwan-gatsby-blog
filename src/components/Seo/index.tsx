import { graphql, useStaticQuery, withPrefix } from 'gatsby';
import PropTypes from 'prop-types';
import * as React from 'react';
import { Helmet } from 'react-helmet';

type SeoProps = {
  description?: string;
  title: string;
  children?: React.ReactNode;
  pathname?: string;
  article?: boolean;
};

const Seo: React.FC<SeoProps> = ({ description, title, pathname, article = false }) => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            siteUrl
            language
          }
        }
      }
    `,
  );

  const metaDescription = description || site.siteMetadata.description;
  // OG 이미지 바꿨을 때 카톡/페이스북 미리보기 갱신: v 값을 올린 뒤 배포 (캐시 무효화)
  const ogImageUrl = `${site.siteMetadata.siteUrl}/og-image.png?v=2`;

  const canonical = new URL(pathname || '/', site.siteMetadata.siteUrl).href;

  return (
    <Helmet
      htmlAttributes={{ lang: site.siteMetadata.language }}
      title={title}
      defaultTitle={site.siteMetadata.title}
      link={[
        { rel: 'canonical', href: canonical },
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${site.siteMetadata.title} RSS`,
          href: withPrefix('/rss.xml'),
        },
      ]}
      meta={[
        {
          property: `og:title`,
          content: title,
        },
        {
          property: `og:site_title`,
          content: title,
        },
        {
          name: `description`,
          content: metaDescription,
        },
        {
          property: `og:description`,
          content: metaDescription,
        },
        {
          property: 'og:url',
          content: canonical,
        },
        {
          property: `og:type`,
          content: article ? 'article' : 'website',
        },
        {
          property: `og:image`,
          content: ogImageUrl,
        },
        {
          name: `twitter:card`,
          content: `summary_large_image`,
        },
        {
          name: `twitter:title`,
          content: title,
        },
        {
          name: `twitter:description`,
          content: metaDescription,
        },
        {
          name: `twitter:image`,
          content: ogImageUrl,
        },
      ]}
    />
  );
};

Seo.defaultProps = {
  description: ``,
};

Seo.propTypes = {
  description: PropTypes.string as React.Validator<string>,
  title: PropTypes.string.isRequired,
};

export default Seo;
