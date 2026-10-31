import { forwardRef, type ButtonHTMLAttributes } from 'react';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ className = '', ...props }, ref) {
    return <button ref={ref} className={`button ${className}`.trim()} {...props} />;
  },
);
