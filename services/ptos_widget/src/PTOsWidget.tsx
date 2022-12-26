import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Widget = styled.div`
  min-width: 320px;
  padding: 1em;
  font-family: arial, helvetica, san-serif;
  background: #eee;
  border-radius: 0.2em;
  box-shadow: 0 0 0.1em rgba(0, 0, 0, 0.5);

  &:last-child {
    border-top: 6px solid red;
  }
`;

const DateBlock = styled.div`
  display: block;
  padding: 0.1em;
  color: #333;
  transition: all 0.25s ease;

  .date__icon {
    float: left;
    width: 3em;
    margin-right: 0.75em;
  }

  .date__month {
    margin-bottom: 0.15em;
    padding: 0.1em;
    color: white;
    font-size: 0.75em;
    text-align: center;
    background: gray;
    border-top-left-radius: 0.3em;
    border-top-right-radius: 0.3em;
  }

  .date__month_today {
    background: #c00000;
  }

  .date__day {
    color: black;
    font-weight: bold;
    font-size: 1.25em;
    text-align: center;
    background: white;
    border: 1px solid #999;
    border-bottom-right-radius: 0.1em;
    border-bottom-left-radius: 0.1em;
  }

  .date__title {
    display: table-cell;
    height: 2.5em;
    font-size: 1.1em;
    vertical-align: middle;
  }

  .date__empty-day {
    font-size: 0.8em;
  }

  .date__people-imgs {
    position: relative;
    display: flex;
    justify-content: center;
  }

  .date__people-imgs img {
    width: 1.5em;
    height: 1.5em;
    margin-right: -10px;
    object-fit: cover;
    border: 0.1em solid white;
    border-radius: 50%;
  }
`;

function PTOsWidget() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string>('');
  const [ptos, setPtos] = useState<{
    [key: string]: Record<
      string,
      { full_name: string | undefined; profile_photo: string | undefined }
    >;
  }>({});

  function apiEndpointInvalid() {
    if (process.env.REACT_APP_API_ENDPOINT === undefined) {
      setIsLoading(false);
      setLoadingError("API endpoint isn't defined");
      return true;
    }
    return false;
  }

  async function fetchPtos() {
    setIsLoading(true);
    setLoadingError('');
    if (apiEndpointInvalid()) {
      return;
    }
    try {
      const response = await fetch(process.env.REACT_APP_API_ENDPOINT || '');
      if (response.status !== 200) {
        setLoadingError(`Status ${response.status}`);
      }
      setPtos(await response.json());
    } catch (error) {
      let errorMessage = 'Failed to load';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setLoadingError(`${errorMessage}. Did you turn on VPN?`);
    } finally {
      setIsLoading(false);
    }
  }

  function isToday(date: string) {
    return (
      new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)
    );
  }

  function emptyDayText(date: string) {
    const weekendNote =
      new Date(date).getDay() % 6 === 0 ? "Ah wait, it's a weekend!" : '';
    return `Everybody's working 🤞 ${weekendNote}`;
  }

  useEffect(() => {
    fetchPtos();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPtos();
    }, 3600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Widget>
      {loadingError && <p>Error occured: {loadingError}</p>}

      {isLoading && <p>Loading ...</p>}

      {Object.keys(ptos).map((date) => (
        <DateBlock key={date}>
          <div className="date__icon">
            <div
              className={`date__month ${isToday(date) && 'date__month_today'}`}
            >
              {new Date(date).toLocaleString('en-us', { month: 'short' })}
            </div>
            <div className="date__day">{new Date(date).getDate()}</div>
          </div>
          <div className="date__title">
            {Object.keys(ptos[date]).length === 0 && (
              <span className="date__empty-day">{emptyDayText(date)}</span>
            )}
            <div className="date__people-imgs">
              {Object.keys(ptos[date]).map((uid) => (
                <img
                  key={uid}
                  alt={ptos[date][uid].full_name}
                  src={ptos[date][uid].profile_photo}
                />
              ))}
            </div>
          </div>
        </DateBlock>
      ))}
    </Widget>
  );
}

export default PTOsWidget;
