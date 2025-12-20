import React from 'react';

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
        <div>
          <div className='pc-only'>
            <S.HomeLink to='/'>{title}</S.HomeLink>
          </div>
          <div className='mobile-only mobile-logo'>
            <S.HomeLink to='/'>K</S.HomeLink>
          </div>
        </div>
        <S.Menu>
          <S.MenuLink to='/posts'>posts</S.MenuLink>
          <S.MenuLink to='/posts'>Hobbies</S.MenuLink>
          <S.MenuLink to='/posts'>Profile</S.MenuLink>
        </S.Menu>
      </S.Header>
    </S.Wrapper>
  );
};

export default Header;
