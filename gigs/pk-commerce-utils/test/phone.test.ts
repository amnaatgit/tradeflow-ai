import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, isPkMobile, toE164, formatPhone, toWhatsAppNumber, whatsAppLink } from "../src/index.js";

test("normalizePhone: every common way of writing the same number matches", () => {
  for (const raw of ["0300-1234567", "0300 1234567", "+92 300 1234567", "923001234567", "3001234567", "0092-300-1234567"]) {
    assert.equal(normalizePhone(raw), "03001234567", raw);
  }
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
});

test("isPkMobile / toE164 / formatPhone", () => {
  assert.equal(isPkMobile("0321-4455667"), true);
  assert.equal(isPkMobile("021-34567890"), false);
  assert.equal(toE164("0321 4455667"), "+923214455667");
  assert.equal(toE164("12345"), null);
  assert.equal(formatPhone("+923001234567"), "0300-1234567");
});

test("WhatsApp numbers and links", () => {
  assert.equal(toWhatsAppNumber("0300-1234567"), "923001234567");
  assert.equal(toWhatsAppNumber("+44 7700 900123"), "447700900123");
  assert.equal(toWhatsAppNumber("123"), null);
  assert.equal(whatsAppLink("03001234567", "Salam! Order confirm"), "https://wa.me/923001234567?text=Salam!%20Order%20confirm");
  assert.equal(whatsAppLink(null, "x"), null);
});
