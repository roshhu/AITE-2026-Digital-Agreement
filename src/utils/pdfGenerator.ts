import jsPDF from 'jspdf';
import { Volunteer, Submission } from '../types';

export const generateAgreementPDF = (volunteer: Volunteer, submission: Submission) => {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');

  // Header
  doc.setFontSize(16);
  doc.setTextColor(255, 0, 0); // Red
  doc.setFont('helvetica', 'bold');
  doc.text('GOVERNMENT OF TELANGANA', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('FOREST DEPARTMENT', 105, 28, { align: 'center' });
  
  doc.setTextColor(0, 0, 0); // Reset color
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Ref Details
  doc.text('Ref No : WL17/2025/WL-3', 20, 45);
  doc.text('Dated : 25-12-2025', 20, 50);
  
  doc.text('Office of the Prl.CCF & HoFF', 190, 45, { align: 'right' });
  doc.text('Aranya Bhavan, Hyderabad', 190, 50, { align: 'right' });

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('Sub: TGFD – AITE 2026- Acknowledgement of Volunteer Selection for AITE 2026 – Reg.', 105, 65, { align: 'center' });
  
  // Dashed Line
  doc.setLineWidth(0.5);
  doc.setLineDash([1, 1], 0);
  doc.line(20, 70, 190, 70);

  // To Address
  doc.setFont('helvetica', 'normal');
  doc.text('To', 20, 80);
  doc.text(`Sri: ${volunteer.full_name}`, 20, 85);
  doc.text(`Allocated District: ${volunteer.district}`, 20, 90);
  
  // Body Text
  doc.setFont('helvetica', 'normal');
  const bodyText = `It is to inform you that you have been selected to participate in AITE 2026. You have been allocated to ${volunteer.district} for the said programme. If you agree to participate, you are requested to kindly submit your declaration accepting the following conditions:`;
  const splitBody = doc.splitTextToSize(bodyText, 170);
  doc.text(splitBody, 20, 105);

  doc.line(20, 120, 190, 120);

  // Declaration Content
  doc.setFontSize(12);
  doc.setTextColor(255, 0, 0); // Red
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARATION', 105, 135, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const declarationPoints = [
    'I hereby declare that I am in good physical and mental health and fit to undertake field duties to participate in AITE-2026.',
    'I affirm that I will strictly abide by all rules, regulations, instructions, and guidelines issued by the Forest Department to conduct of this work.',
    'I express my willingness and consent to participate and actively articulate in the All India Tiger Estimation (AITE) in the district allocated to me.',
    'I further declare that I will continue and complete this exercise from 19th Jan to 25th January, 2026 with dedication, discipline, and integrity.'
  ];

  let yPos = 155;
  declarationPoints.forEach(point => {
    // Draw Checkmark
    doc.setTextColor(0, 128, 0); // Green
    doc.text('V', 20, yPos); // Using V as simple checkmark approximation in standard font
    
    doc.setTextColor(0, 0, 0);
    const splitText = doc.splitTextToSize(point, 160);
    doc.text(splitText, 25, yPos);
    yPos += 8 * splitText.length + 5;
  });

  // Signature Section
  yPos += 15;
  doc.text('Signed on: ' + new Date(submission.submitted_at).toLocaleString(), 20, yPos);
  
  yPos += 10;
  doc.text('Digital Signature:', 20, yPos);
  
  if (submission.signature_url) {
    try {
        // Add signature image
        doc.addImage(submission.signature_url, 'PNG', 20, yPos + 5, 60, 30);
    } catch (e) {
        console.error("Error adding signature image to PDF", e);
        doc.text("[Signature Image Error]", 20, yPos + 20);
    }
  }

  if (submission.photo_data) {
    yPos += 35;
    doc.text('Signature Photo Reference:', 20, yPos);
    try {
        doc.addImage(submission.photo_data, 'JPEG', 20, yPos + 5, 40, 20); // Smaller aspect ratio for sig
        yPos += 25; 
    } catch (e) {
        console.error("Error adding uploaded signature to PDF", e);
    }
  }

  // Footer Audit Trail
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Audit Trail: IP ${submission.ip_address} | Device: ${submission.device_fingerprint?.substring(0, 30)}...`, 105, pageHeight - 10, { align: 'center' });
  doc.text(`Submission ID: ${submission.id}`, 105, pageHeight - 6, { align: 'center' });

  // Save
  doc.save(`Agreement_${volunteer.auth_code}.pdf`);
};
