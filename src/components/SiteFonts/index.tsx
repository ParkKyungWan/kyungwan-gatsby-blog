import React from 'react';
import { Helmet } from 'react-helmet';

// Keep the same font stylesheet mounted during SSR and client-side navigation.
const SiteFonts: React.FC = () => (
  <Helmet>
    <link rel='stylesheet' href='/fonts/fonts.css' />
  </Helmet>
);

export default SiteFonts;
