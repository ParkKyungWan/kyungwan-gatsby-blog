import React from 'react';

import ActivityTable, { ActivityTableData } from '../components/ActivityTable';
import Seo from '../components/Seo';
import Section from '../components/Section';
import Layout from '../layout';

type ActivityProps = {
  location: Location;
};

// 예시 데이터
const exampleData: ActivityTableData = {
  month: 1,
  day: 31,
  data: [
    ['🏃', [2, 1, 0, 2, 1, 1, 0]],
    ['📚', [1, 2, 2, 0, 1, 0, 2]],
  ],
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
        <ActivityTable data={exampleData} />
      </Section>
    </Layout>
  );
};

export default Activity;