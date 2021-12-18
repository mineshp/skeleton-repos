import styled from 'styled-components';
import Link from 'next/link';

const MainContainer = styled.div`
  padding-bottom: ${({ theme }) => theme.paddingMid};
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
  border-radius: 6px;
  background-color: ${({ theme }) => theme.tertiary};
  padding: ${({ theme }) => theme.paddingMid};
  margin-bottom: ${({ theme }) => theme.paddingMid};
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #6b6d9e;
  padding-bottom: 10px;
  padding-top: 20px;
  margin-bottom: 30px;
  align-items: baseline;
`;

export default function Home() {
  return (
    <>
      <MainContainer>
        <Container>
          <h1>Welcome to X</h1>
          <p>X is where the magic happens </p>
        </Container>
      </MainContainer>
    </>
  );
}
