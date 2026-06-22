'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  className?: string;
  style?: React.CSSProperties;
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
}

export function EditableText({
  value,
  onChange,
  isEditing,
  className = '',
  style,
  tag: Tag = 'span',
}: Props) {
  if (!isEditing) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  /*
   * dangerouslySetInnerHTML sets the initial text content on mount.
   * onBlur captures whatever the user typed.
   * React won't touch the innerHTML again between blur events because
   * the parent only re-renders after onChange updates the state.
   * XSS: content comes exclusively from our own admin state, no user input reaches the HTML.
   */
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      className={`${className} outline-none ring-2 ring-blue-400/60 ring-offset-1 rounded cursor-text`}
      style={style}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: value }}
      onBlur={(e) => onChange((e.target as HTMLElement).textContent ?? '')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
}
