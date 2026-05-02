"use client";

import { useEffect, useState } from "react";

const LS_KEY = "last_whatsapp_contact";
const WA_MSG = "Olá! Gostaria de saber mais sobre a StudyTrack para minha instituição.";
const ENCODED_MSG = encodeURIComponent(WA_MSG);

const CONTACTS = [
  { id: "0", phone: "5516994045785" },
  { id: "1", phone: "5516996973320" },
];

function pickNext(lastId: string | null) {
  const lastIdx = CONTACTS.findIndex((c) => c.id === lastId);
  return CONTACTS[(lastIdx + 1) % CONTACTS.length];
}

export function useWhatsAppContact() {
  const [contact, setContact] = useState(CONTACTS[0]);

  useEffect(() => {
    const lastId = localStorage.getItem(LS_KEY);
    setContact(pickNext(lastId));
  }, []);

  function onBeforeNavigate() {
    localStorage.setItem(LS_KEY, contact.id);
  }

  return {
    url: `https://wa.me/${contact.phone}?text=${ENCODED_MSG}`,
    onBeforeNavigate,
  };
}
