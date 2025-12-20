import { graphql, useStaticQuery } from 'gatsby';
import PropTypes from 'prop-types';
import * as React from 'react';
import { Helmet } from 'react-helmet';

type SeoProps = {
  description?: string;
  title: string;
  children?: React.ReactNode;
};

const Seo: React.FC<SeoProps> = ({ description, title }) => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
            description
            ogImage
            siteUrl
          }
        }
      }
    `,
  );

  const metaDescription = description || site.siteMetadata.description;

  return (
    <Helmet
      htmlAttributes={{ lang: 'en' }}
      title={title}
      defaultTitle={site.siteMetadata.title}
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
          property: 'og:image',
          content: site.siteMetadata.ogImage,
        },
        {
          property: 'og:url',
          content: site.siteMetadata.siteUrl,
        },
        {
          property: `og:type`,
          content: `website`,
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
