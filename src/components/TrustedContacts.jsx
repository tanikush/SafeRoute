
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrustedContacts() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadContacts() {
    setLoading(true);
    setError('');

    const { data: { user }, error: userError } =
      await supabase.auth.getUser();

    if (userError || !user) {
      setError('Please log in first.');
      setLoading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      setError(dbError.message);
    } else {
      setContacts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  async function addContact(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone) {
      setError('Name and phone number are required.');
      return;
    }

    setSaving(true);

    const { data: { user }, error: userError } =
      await supabase.auth.getUser();

    if (userError || !user) {
      setError('Please log in again.');
      setSaving(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('trusted_contacts')
      .insert({
        user_id: user.id,
        name: cleanName,
        phone: cleanPhone,
        relationship: relationship.trim() || null,
      })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
    } else {
      setContacts(previous => [data, ...previous]);
      setName('');
      setPhone('');
      setRelationship('');
      setMessage('Contact saved successfully!');
    }

    setSaving(false);
  }

  async function deleteContact(id) {
    const confirmed = window.confirm(
      'Delete this trusted contact?'
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    const { error: dbError } = await supabase
      .from('trusted_contacts')
      .delete()
      .eq('id', id);

    if (dbError) {
      setError(dbError.message);
    } else {
      setContacts(previous =>
        previous.filter(contact => contact.id !== id)
      );
      setMessage('Contact deleted.');
    }
  }

  return (
    <section className="trusted-contacts">
      <h2>Trusted Contacts</h2>
      <p>Add people you trust for emergency alerts.</p>

      <form onSubmit={addContact}>
        <label>
          Full name
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Contact name"
            maxLength={100}
            required
          />
        </label>

        <label>
          Phone number
          <input
            type="tel"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="+91 9876543210"
            maxLength={20}
            required
          />
        </label>

        <label>
          Relationship (optional)
          <input
            value={relationship}
            onChange={event =>
              setRelationship(event.target.value)
            }
            placeholder="Friend, family..."
            maxLength={50}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Contact'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <h3>Saved Contacts ({contacts.length})</h3>

      {loading ? (
        <p>Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <p>No trusted contacts added yet.</p>
      ) : (
        <ul>
          {contacts.map(contact => (
            <li key={contact.id}>
              <strong>{contact.name}</strong>
              <p>{contact.phone}</p>
              {contact.relationship && (
                <p>{contact.relationship}</p>
              )}
              <button
                type="button"
                onClick={() => deleteContact(contact.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
