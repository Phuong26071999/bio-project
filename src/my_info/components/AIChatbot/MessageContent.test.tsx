import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageContent from './MessageContent';

test('renders model output as text, never as HTML', () => {
  const { container } = render(<MessageContent text={'<img src=x onerror="alert(1)"><script>alert(2)</script>'} />);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('script')).toBeNull();
  expect(container.textContent).toContain('<img src=x');
});

test('renders bold, lists and safe links', () => {
  const { container } = render(
    <MessageContent
      text={'**Skills**\n- React\n- Next.js\n\n1. one\n2. two\nMail thhphuong2607@gmail.com or see [Projects](#projects) and https://github.com/Phuong26071999'}
    />,
  );
  expect(container.querySelector('strong')?.textContent).toBe('Skills');
  expect(container.querySelectorAll('ul li')).toHaveLength(2);
  expect(container.querySelectorAll('ol li')).toHaveLength(2);
  expect(screen.getByText('thhphuong2607@gmail.com').getAttribute('href')).toBe('mailto:thhphuong2607@gmail.com');
  expect(screen.getByText('Projects').getAttribute('href')).toBe('#projects');
  const external = screen.getByText('https://github.com/Phuong26071999');
  expect(external.getAttribute('target')).toBe('_blank');
  expect(external.getAttribute('rel')).toBe('noopener noreferrer');
});

test('drops links with unsafe schemes', () => {
  const { container } = render(<MessageContent text={'[click me](javascript:alert(1)) [data](data:text/html,hi)'} />);
  expect(container.querySelector('a')).toBeNull();
  expect(container.textContent).toContain('click me');
});
