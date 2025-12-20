import React from 'react';

import Seo from '../components/Seo';
import Layout from '../layout';
import Banner from '../components/Banner';

type HomeProps = {
  location: Location;
};

const Home: React.FC<HomeProps> = ({ location }) => {
  return (
    <>
    <Banner/>
    <Layout location={location} hasBanner={true}>
      <Seo title='경완' />
    </Layout>
    </>
  );
};

export default Home;
