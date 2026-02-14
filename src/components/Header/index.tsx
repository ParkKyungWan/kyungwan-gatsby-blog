import React from 'react';

import ThemeToggle from '../ThemeToggle';
import * as S from './styled';

type HeaderProps = {
  title: string;
  location: Location;
};

const Header: React.FC<HeaderProps> = ({ title, location }) => {
  const { pathname } = location;

  return (
    <S.Wrapper>
      <S.Header>
        <S.TitleWrapper>
          <div>
            <div className='pc-only'>
              <S.HomeLink to='/'>{title}</S.HomeLink>
            </div>
            <div className='mobile-only mobile-logo'>
              <S.HomeLink to='/'>K</S.HomeLink>
            </div>
          </div>
        </S.TitleWrapper>
        <S.Menu>
          <S.MenuLink to='/posts'>Posts</S.MenuLink>
          <S.MenuLink to='/activity'>Activity</S.MenuLink>
          <ThemeToggle />
          {/* <S.MenuLink to='/hobbies'>Hobbies</S.MenuLink> */}
        </S.Menu>
      </S.Header>
    </S.Wrapper>
  );
};

export default Header;
