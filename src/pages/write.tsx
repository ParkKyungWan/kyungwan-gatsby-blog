import React from 'react';
import { Helmet } from 'react-helmet';
import WriteEditor from '../components/WriteEditor';
import Seo from '../components/Seo';
import Layout from '../layout';

const WritePage: React.FC<{ location: Location }> = ({ location }) => (
  <Layout location={location} compactTop headerAligned>
    <Seo pathname='/write/' title='글쓰기 · ruddhks.my' />
    <Helmet>
      <meta name='robots' content='noindex,nofollow' />
    </Helmet>
    <WriteEditor />
  </Layout>
);
export default WritePage;
