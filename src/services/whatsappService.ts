/**
 * WhatsApp Patient Onboarding Service
 * 
 * Enables patients to register via WhatsApp messages.
 * Uses Gemini AI to parse WhatsApp messages into structured patient data.
 * 
 * Flow:
 * 1. Patient sends WhatsApp message with their info
 * 2. Message is parsed by Gemini AI
 * 3. Structured data is returned as Patient object
 * 4. Patient is auto-created in database
 * 5. Confirmation message is sent back via WhatsApp
 */

import { Patient, District } from '../types';
import { geminiService } from './geminiService';
import { dataService } from '../dataService';
import { supabase } from '../lib/supabase';

// ============================================
// WHATSAPP MESSAGE TEMPLATES
// ============================================

// Welcome message sent when patient starts conversation
export const WHATSAPP_WELCOME_MESSAGE = `🏥 *NursingCare Karachi*

Welcome! I'm your AI assistant. I can help you register for home nursing care.

*To register, please send:*
• Your full name
• CNIC number
• Phone number
• Complete address (area/town)
• Medical condition/requirement
• Type of service needed (Nursing/Attendant/Baby Sitter)

*Example:*
"Name: Ahmed Khan
CNIC: 42201-1234567-1
Phone: 0321-1234567
Address: House 123, Block 5, Gulshan-e-Iqbal
Condition: Post-surgery recovery
Service: 24/7 Nursing Care"

Or simply describe your needs in your own words and I'll extract the details! 😊`;

// Confirmation message after successful registration
export const WHATSAPP_CONFIRMATION_MESSAGE = (patient: Patient, staffName?: string) => `✅ *Registration Successful!*

Thank you, ${patient.full_name}!

*Your Details:*
📋 Case ID: Pending Assignment
📍 District: ${patient.district}
🏥 Service: ${patient.service_type}
💰 Rate: Rs. ${patient.billing_rate?.toLocaleString() || 'To be confirmed'}/month

${staffName ? `👩‍️ *Assigned Staff:* ${staffName}\n\nYour caregiver will contact you shortly to confirm the schedule.` : `⏳ *Staff Assignment:* We're matching you with the best available caregiver in your area. You'll receive a confirmation shortly.`}

*Need help?* Reply to this message or call us.

🏥 *NursingCare Karachi*
Home Healthcare Services`;

// ============================================
// WHATSAPP PARSING PROMPTS
// ============================================

const WHATSAPP_PARSE_PROMPT = `You are a medical data extraction assistant for NursingCare Karachi, a home nursing care agency.

Parse the following WhatsApp message from a potential patient and extract their registration information.

Return ONLY a JSON object with these fields. If a field cannot be determined, use null.

{
  "full_name": "string or null",
  "cnic": "string or null (format: XXXXX-XXXXXXX-X if found)",
  "contact": "string or null (format: +92 3XX XXXXXXX if possible)",
  "district": "string or null (Karachi district: Karachi South, Karachi Central, Karachi East, Karachi West, Korangi, Malir, Keamari, Gulshan-e-Iqbal, Nazimabad, Orangi Town)",
  "address": "string or null",
  "medical_condition": "string or null",
  "service_type": "string or null (one of: '24/7 Nursing Care', '12/7 Nursing Care', 'Attendant Service', 'Physiotherapy', 'Baby Sitting', or infer from context)",
  "gender": "'Male' or 'Female' or null",
  "guardian_name": "string or null (if mentioned)",
  "guardian_contact": "string or null (if mentioned)",
  "billing_rate": "number or null (estimate: 75000 for 24/7 nursing, 45000 for 12/7 nursing, 30000 for attendant, 50000 for physiotherapy)"
}

WhatsApp Message:
`;

// ============================================
// MAIN PARSING FUNCTION
// ============================================

export interface WhatsAppParseResult {
  success: boolean;
  patient?: Partial<Patient>;
  error?: string;
  confidence: number; // 0-100
  rawText: string;
}

export async function parseWhatsAppMessage(
  message: string
): Promise<WhatsAppParseResult> {
  try {
    const prompt = WHATSAPP_PARSE_PROMPT + message;
    
    const response = await geminiService.fastTask(prompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Could not parse response as JSON',
        confidence: 0,
        rawText: response,
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Calculate confidence based on how many required fields were found
    const requiredFields = ['full_name', 'contact', 'address', 'medical_condition'];
    const foundRequired = requiredFields.filter(f => parsed[f]);
    const confidence = Math.round((foundRequired.length / requiredFields.length) * 100);
    
    // Normalize phone number to +92 format
    if (parsed.contact) {
      const digits = parsed.contact.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('03')) {
        parsed.contact = `+92${digits.slice(1)}`;
      } else if (digits.length === 13 && digits.startsWith('92')) {
        parsed.contact = `+${digits}`;
      }
    }
    
    // Set default values
    const patient: Partial<Patient> = {
      full_name: parsed.full_name || '',
      cnic: parsed.cnic || '',
      contact: parsed.contact || '',
      district: parsed.district || 'Karachi South',
      address: parsed.address || '',
      medical_condition: parsed.medical_condition || '',
      service_type: parsed.service_type || '24/7 Nursing Care',
      gender: parsed.gender || 'Male',
      guardian_name: parsed.guardian_name || '',
      guardian_contact: parsed.guardian_contact || '',
      billing_rate: parsed.billing_rate || 75000,
      status: 'Pending',
      admission_date: new Date().toISOString().split('T')[0],
      billing_package: 'Standard',
      payment_method: 'Cash',
      advance_payment_received: false,
    };
    
    return {
      success: true,
      patient,
      confidence,
      rawText: response,
    };
  } catch (error) {
    console.error('WhatsApp parse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      confidence: 0,
      rawText: '',
    };
  }
}

// ============================================
// AUTO-REGISTER FROM WHATSAPP
// ============================================

export async function autoRegisterFromWhatsApp(
  message: string
): Promise<{ success: boolean; patient?: Patient; error?: string }> {
  // Parse the message
  const parseResult = await parseWhatsAppMessage(message);
  
  if (!parseResult.success || !parseResult.patient) {
    return {
      success: false,
      error: parseResult.error || 'Could not parse message',
    };
  }
  
  // Check confidence - auto-register only if confidence >= 60%
  if (parseResult.confidence < 60) {
    return {
      success: false,
      error: `Low confidence (${parseResult.confidence}%). Please provide more details.`,
    };
  }
  
  // Create patient in database
  try {
    const patient = await dataService.addPatient(parseResult.patient as Omit<Patient, 'id'>);
    return { success: true, patient };
  } catch (error) {
    console.error('Failed to create patient:', error);
    return {
      success: false,
      error: 'Failed to save patient. Please try again.',
    };
  }
}

// ============================================
// WHATSAPP QUICK REPLY TEMPLATES
// ============================================

export const QUICK_REPLIES = {
  services: `Our Services:
1️⃣ 24/7 Nursing Care - Rs. 75,000/month
2️⃣ 12/7 Nursing Care - Rs. 45,000/month
3️⃣ Attendant Service - Rs. 30,000/month
4️⃣ Physiotherapy - Rs. 50,000/month
5️⃣ Baby Sitting - Rs. 25,000/month

Reply with the number to select a service.`,

  areas: `We serve all Karachi areas:
📍 Karachi South
📍 Karachi Central
📍 Karachi East
📍 Karachi West
📍 Korangi
📍 Malir
📍 Keamari
📍 Gulshan-e-Iqbal
📍 Nazimabad
📍 Orangi Town

Which area are you in?`,

  help: `How can I help you?
1️⃣ Register for home care
2️⃣ Check staff availability
3️⃣ View our services & pricing
4️⃣ Talk to a coordinator
5️⃣ Emergency request

Reply with a number.`,
};

// ============================================
// WHATSAPP PHONE NUMBER FORMATTING
// ============================================

export function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Convert to international format
  if (digits.length === 11 && digits.startsWith('03')) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('92')) {
    return `+${digits}`;
  }
  
  // Return as-is if format is unknown
  return phone;
}

export function getWhatsAppLink(phone: string): string {
  const formatted = formatWhatsAppNumber(phone);
  return `https://wa.me/${formatted.replace(/[^0-9]/g, '')}`;
}
