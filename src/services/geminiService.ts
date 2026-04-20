import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export const geminiService = {
  /**
   * Analyze an image using gemini-3.1-pro-preview
   */
  async analyzeImage(base64Image: string, prompt: string = "Analyze this image in the context of nursing care and medical management."): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image.split(",")[1] || base64Image,
                },
              },
            ],
          },
        ],
      });
      return response.text || "No analysis generated.";
    } catch (error) {
      console.error("Error analyzing image:", error);
      throw error;
    }
  },

  /**
   * Chat with AI using gemini-3-flash-preview with Search Grounding
   */
  async chatWithSearch(message: string): Promise<{ text: string; sources?: any[] }> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: message }] }],
        config: {
          systemInstruction: "You are the NursingCare.pk AI Assistant for the Karachi Portal. This dashboard manages home nursing services, including staff (nurses, attendants), patients, scheduling, and payroll. You help users extract data from raw text/images, answer questions about operations, and provide strategic insights based on the dashboard data.",
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "No response generated.";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      return { text, sources };
    } catch (error) {
      console.error("Error in chat with search:", error);
      throw error;
    }
  },

  /**
   * Fast general intelligence task using gemini-3.1-flash-lite-preview
   */
  async fastTask(prompt: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("Error in fast task:", error);
      throw error;
    }
  },

  /**
   * Complex reasoning task using gemini-3.1-pro-preview
   */
  async complexReasoning(prompt: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("Error in complex reasoning:", error);
      throw error;
    }
  },

  /**
   * Extract data from image using gemini-3.1-flash-lite-preview
   */
  async extractDataFromImage(base64Image: string, type: 'staff' | 'patient'): Promise<any> {
    const prompt = type === 'staff' 
      ? "Extract staff information from this image (CNIC or form). Return JSON with fields: full_name, father_husband_name, date_of_birth, gender, cnic, religion, marital_status, mobile_number, alt_number, email, whatsapp, address, area_town, city, category (one of: Management, Nurses, Midwives, Attendants, Doctors, Technical, Other), designation (specific role), total_experience, relevant_experience, shift_preference, expected_salary, availability, preferred_payment, bank_name, account_title, account_number, iban, education (array of {degree, institution, year, marks}), employment_history (array of {employer, position, duration, reason}), emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_alt_phone. If a field is not found, leave it null."
      : "Extract patient information from this image (CNIC or form). Return JSON with fields: full_name, cnic, contact, alt_contact, email, whatsapp, address, area, city, date_of_birth, gender, blood_group, marital_status, guardian_name, guardian_contact, guardian_cnic, guardian_relationship, medical_condition, primary_diagnosis, current_condition, current_medications, allergies, medical_requirements (array), equipment_requirements (array), emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, doctor_name, doctor_specialty, doctor_hospital, doctor_phone. If a field is not found, leave it null.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image.split(",")[1] || base64Image,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Error extracting data from image:", error);
      throw error;
    }
  },

  /**
   * Parse raw text data into structured staff or patient objects
   */
  async parseRawData(text: string): Promise<{ type: 'staff' | 'patient' | 'unknown', data: any }> {
    const prompt = `Analyze the following raw text and determine if it contains information about a healthcare staff member (nurse, attendant, etc.) or a patient.
    
    If it's a staff member, extract: full_name, father_husband_name, date_of_birth, gender, cnic, religion, marital_status, mobile_number, alt_number, email, whatsapp, address, area_town, city, category (one of: Management, Nurses, Midwives, Attendants, Doctors, Technical, Other), designation, total_experience, relevant_experience, shift_preference, expected_salary, availability, preferred_payment, bank_name, account_title, account_number, iban, education, employment_history, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_alt_phone.
    If it's a patient, extract: full_name, cnic, contact, alt_contact, email, whatsapp, address, area, city, date_of_birth, gender, blood_group, marital_status, guardian_name, guardian_contact, guardian_cnic, guardian_relationship, medical_condition, primary_diagnosis, current_condition, current_medications, allergies, medical_requirements, equipment_requirements, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, doctor_name, doctor_specialty, doctor_hospital, doctor_phone.
    
    Return a JSON object with:
    {
      "type": "staff" | "patient" | "unknown",
      "data": { ...extracted fields... }
    }
    
    Raw Text:
    ${text}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{"type": "unknown", "data": {}}');
    } catch (error) {
      console.error("Error parsing raw data:", error);
      return { type: 'unknown', data: {} };
    }
  },

  /**
   * Analyze scraped market data
   */
  async analyzeMarketData(markdown: string): Promise<string> {
    const prompt = `Analyze the following scraped web content about a home care or nursing service provider in Karachi. 
    Extract and summarize:
    1. Services offered (nursing, attendants, etc.)
    2. Pricing or packages (if mentioned)
    3. Location/Area covered
    4. Contact information
    5. Unique selling points or reputation
    6. Comparison to our standard services (Home nursing, 12/24hr shifts, etc.)
    
    Scraped Content:
    ${markdown}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      return response.text || "No analysis generated.";
    } catch (error) {
      console.error("Error analyzing market data:", error);
      throw error;
    }
  }
};
