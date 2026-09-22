import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

const ShareRedirect = ({ type = 'dish' }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/', { replace: true });
      return;
    }

    const query = searchParams.toString();
    const destination = query ? `/store/${id}?${query}` : `/store/${id}`;
    navigate(destination, { replace: true });
  }, [id, searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: 'var(--text-secondary)',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div className="pulse-container" style={{ marginBottom: '1rem' }}>
        <div className="pulse-dot"></div>
      </div>
      <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
        {type === 'dish' ? 'Loading dish on UniVerse...' : 'Opening stall on UniVerse...'}
      </p>
    </div>
  );
};

export default ShareRedirect;
