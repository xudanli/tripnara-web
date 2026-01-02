import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
  };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: '700',
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {t('contact.title')}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
            }}
          >
            {t('contact.name')}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
            }}
          >
            {t('contact.email')}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
            }}
          >
            {t('contact.message')}
          </label>
          <textarea
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            required
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '1rem',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {t('contact.send')}
        </button>
      </form>
    </div>
  );
}
