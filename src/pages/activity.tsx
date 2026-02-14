import React from 'react';

import Seo from '../components/Seo';
import Section from '../components/Section';
import Layout from '../layout';

type ActivityProps = {
  location: Location;
};

const Activity: React.FC<ActivityProps> = ({ location }) => {
  return (
    <Layout location={location} hasBanner={false}>
      <Seo title='경완 | Activity' />
      <Section
        header={{
          emoji: '📋',
          kr: '기록',
          en: 'Activity',
        }}
      >
        <div>활동 컨텐츠를 여기에 추가하세요</div>
      </Section>
    </Layout>
  );
};

export default Activity;