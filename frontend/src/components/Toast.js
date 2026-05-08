import React, { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

export const Toast = ({ id, message, type }) => {
  const { removeToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 3000);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  const typeStyles = {
    success: 'bg-success border-success',
    error: 'bg-danger border-danger',
    info: 'bg-accent border-accent',
    warning: 'bg-warning border-warning',
  };

  return (
    <div
      className={`glass ${typeStyles[type]} border-l-4 px-4 py-3 text-white rounded-lg shadow-lg animate-slide-in`}
    >
      <p>{message}</p>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};
