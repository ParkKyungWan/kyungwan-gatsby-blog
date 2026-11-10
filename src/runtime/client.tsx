import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import PublishedPost from './PublishedPost';
const root = document.getElementById('published-root');
const data = document.getElementById('published-data')?.textContent;
if (root && data) hydrateRoot(root, <PublishedPost data={JSON.parse(data)} />);
