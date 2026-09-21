import React, { useState, useEffect } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';

const ToastFeedback = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const handleShowToast = (e) => {
      const { message, icon } = e.detail || {};
      setToast({ message: message || 'Link copied to clipboard!', icon: icon || '📋' });
      
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 2600);
    };

    window.addEventListener('universe_show_toast', handleShowToast);
    return () => {
      window.removeEventListener('universe_show_toast', handleShowToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="universe-toast-feedback-wrapper">
      <div className="universe-toast-feedback-pill animate-fade-in-up">
        <span className="toast-icon-badge">
          <CheckCircle2 size={16} color="#10b981" />
        </span>
        <span className="toast-message-text">{toast.message}</span>
      </div>
    </div>
  );
};

export default ToastFeedback;
