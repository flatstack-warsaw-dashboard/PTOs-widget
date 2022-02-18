import React, { useState, useEffect } from 'react';
import './PTOsWidget.css';

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
      setLoadingError("Api endpoint isn't defined");
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
      setLoadingError(errorMessage);
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
    <div className="ptos-widget">
      <h1>Personal days-off</h1>

      {loadingError && <p>Error occured: {loadingError}</p>}

      {isLoading && <p>Loading ...</p>}

      {Object.keys(ptos).map((date) => (
        <div key={date} className="date">
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
        </div>
      ))}
    </div>
  );
}

export default PTOsWidget;
