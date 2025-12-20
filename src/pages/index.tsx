import React from 'react';

import Seo from '../components/Seo';
import Layout from '../layout';

type HomeProps = {
  location: Location;
};

const Home: React.FC<HomeProps> = ({ location }) => {
  return (
    <Layout location={location}>
      <Seo title='경완' />
    </Layout>
  );
};

export default Home;
