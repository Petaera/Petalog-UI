import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Privacy Policy and Terms & Conditions
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Petalog Mobile Application
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              <strong>Effective Date:</strong> July 26, 2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <section className="mb-8">
              <p className="mb-4">
                <strong>Developed by:</strong> PETAERA TECHNOLOGIES LLP<br/>
                <strong>Registered Office:</strong> Sy No 232/6 Thekkumuri, Karalmanna, Palakkad, Kerala, India, 679506
              </p>
              <p className="mb-4">
                This Privacy Policy describes how PETAERA TECHNOLOGIES LLP ("we," "us," or "our") collects, uses, processes, stores, and discloses information about you through our "Petalog" mobile application (the "App"). The App is a comprehensive solution designed to facilitate detailed vehicle logging, tracking, and operational management across various business environments, including car washes, fuel stations, godowns, and crushers. Key features include Automatic Number Plate Recognition (ANPR) camera integration, distinct Owner and Manager Dashboards with financial and operational reporting, user management, pricing controls, vehicle history tracking, loyalty features, and internal ticketing systems.
              </p>
              <p>
                By downloading, installing, accessing, or using the Petalog App, you explicitly agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with these terms, please do not use the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="mb-4">
                To provide, maintain, and enhance the Petalog App's functionality, and to ensure the secure and efficient operation of your vehicle management system, we collect various types of information.
              </p>
              
              <h3 className="text-xl font-medium mb-3">A. Information You Provide Directly to Us:</h3>
              <p className="mb-4">
                When you register for an account, actively use the App (as either an Owner or a Manager), or communicate with us, you may provide the following personal and operational information:
              </p>

              <h4 className="text-lg font-medium mb-2">Account and Profile Information:</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>User Identity:</strong> Your full name, email address, phone number, and a unique user ID.</li>
                <li><strong>Organizational Details:</strong> Your specific role within your organization (e.g., Owner, Manager), the official name of your business (e.g., specific car wash, fuel station, godown, crusher), and its operational location(s).</li>
                <li><strong>Login Credentials:</strong> Encrypted password or other authentication details.</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Vehicle and Transaction Data (Manual Entries):</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Vehicle Identification:</strong> License plate numbers, vehicle make, model, color, and precise vehicle type (e.g., Car, Bike, Truck, Van).</li>
                <li><strong>Service Details:</strong> The specific type of service chosen (e.g., Standard Wash, Full Tank Petrol, goods loaded/unloaded, material type), the 'Entry Type' ('Normal Entry' or 'Workshop Entry'), and the corresponding Amount Paid.</li>
                <li><strong>Financial Details:</strong> The exact Amount Paid and Discount Applied for each manual transaction, contributing to your organization's revenue tracking.</li>
                <li><strong>Remarks:</strong> Any additional text-based notes or comments entered by operators or owners concerning a vehicle or transaction.</li>
                <li><strong>Manager Identification:</strong> The name of the manager responsible for logging a specific manual entry.</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">B. Information Collected Automatically (Including via Network Cameras - ANPR):</h3>
              <p className="mb-4">
                When you use the App, certain information is collected automatically, which is vital for the App's core functionality, security, and the comprehensive operational insights it provides.
              </p>

              <h4 className="text-lg font-medium mb-2">Image and Video Data (via Integrated Network Cameras - ANPR System):</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Purpose:</strong> The App integrates with designated Automatic Number Plate Recognition (ANPR) network cameras strategically deployed at key operational checkpoints (e.g., entry/exit points of car washes, fuel pumps, godown gates, crusher sites).</li>
                <li><strong>Content:</strong> This data primarily consists of images/video frames of vehicles, including their license plates for ANPR, their overall appearance, and the immediate surroundings of the vehicle.</li>
                <li><strong>Use for Unmatched Entries:</strong> Captured Entry Images are crucial for the "Comparison Section" in the Owner Dashboard, enabling the identification and reconciliation of discrepancies between automated ANPR logs and manual transaction entries.</li>
                <li><strong>Retention:</strong> Image/video data is stored temporarily for immediate operational verification and for a defined period for audit, security, and dispute resolution.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">
                We use the information we collect for the following critical purposes, enabling the App's robust management and operational capabilities:
              </p>

              <h3 className="text-xl font-medium mb-3">To Provide and Maintain the Core Service Functionality:</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>To enable efficient vehicle logging, tracking, and the comprehensive management features provided by both the Owner Dashboard and Manager Portal.</li>
                <li>To accurately process and record service transactions, including calculating and displaying amounts paid, discounts applied, service choices, and Entry Types ('Normal'/'Workshop').</li>
                <li>To display real-time and historical operational data, including vehicle entry/exit times, ANPR images, and service details.</li>
                <li>To manage user accounts, roles, and granular access permissions for Owners and Managers across different locations.</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">For Comprehensive Operational Management, Auditing, and Efficiency:</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>ANPR System:</strong> To facilitate automated vehicle identification and verification through license plate recognition and associated image capture.</li>
                <li><strong>Financial Reporting & Reconciliation:</strong> To power the "Home Page," "Statistics Section," and "Comparison Section" in the Owner Dashboard.</li>
                <li><strong>Visual Records:</strong> To provide verifiable visual records for audit trails, security purposes, and dispute resolution.</li>
                <li><strong>Operational Reporting & Analytics:</strong> To generate comprehensive statistics and reports for business performance monitoring.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Share Your Information</h2>
              <p className="mb-4">
                We share your information only in limited circumstances and for specific purposes, ensuring data integrity and user privacy:
              </p>

              <h3 className="text-xl font-medium mb-3">With Your Organization:</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Owners:</strong> All data you input or that is collected automatically is accessible to the Owners of the organization for complete business oversight and management.</li>
                <li><strong>Managers:</strong> Managers only have access to data directly relevant to their operational scope within the Manager Portal, without access to sensitive financial data.</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">Service Providers:</h3>
              <p className="mb-4">
                We engage trusted third-party companies and individuals to facilitate our services, including cloud hosting providers, data analytics providers, and technical support services. These third parties have access to your information only to perform tasks on our behalf and are obligated not to disclose or use it for any other purpose.
              </p>

              <h3 className="text-xl font-medium mb-3">Legal Requirements:</h3>
              <p className="mb-4">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities when we believe such action is necessary to protect rights, property, or safety.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Specifics Regarding Image and Video Data from Network Cameras (ANPR)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Primary Purpose:</strong> Automated vehicle identification, real-time operational validation, enhanced security, and detailed record-keeping.</li>
                <li><strong>Scope of Capture:</strong> ANPR cameras are strategically placed at designated operational checkpoints to capture vehicles and their immediate surroundings.</li>
                <li><strong>No Facial Recognition:</strong> We explicitly do NOT use facial recognition technology to identify individuals. Our focus remains solely on vehicle identification.</li>
                <li><strong>Access Control:</strong> Access to raw image and video data is strictly controlled and limited to authorized personnel.</li>
                <li><strong>Retention Policy:</strong> Image and video data is retained for a period determined by operational and legal requirements, then securely deleted or anonymized.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="mb-4">
                PETAERA TECHNOLOGIES LLP is deeply committed to protecting the security of your information. We implement industry-standard technical and organizational measures:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> Data is encrypted both in transit (using TLS/SSL) and at rest (on secure servers).</li>
                <li><strong>Access Controls:</strong> We employ strict access controls and multi-factor authentication mechanisms.</li>
                <li><strong>Network Security:</strong> We utilize firewalls, intrusion detection systems, and other advanced network security measures.</li>
                <li><strong>Regular Audits:</strong> We conduct periodic security assessments, vulnerability testing, and penetration testing.</li>
                <li><strong>Employee Training:</strong> Our employees receive regular training on data privacy and security best practices.</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
              <p className="mb-4">
                We retain your personal information and operational data for as long as necessary to fulfill the specific purposes for which it was collected:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Retained as long as your account is active and for a reasonable period thereafter.</li>
                <li><strong>Operational Logs:</strong> Retained for the duration necessary for your organization's operational needs, auditing, and compliance.</li>
                <li><strong>Image and Video Data:</strong> Retained for the period configured by your organization for operational verification and security.</li>
                <li><strong>Financial Data:</strong> Retained for periods mandated by financial regulations and tax laws.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Your Choices and Rights</h2>
              <p className="mb-4">
                Depending on your location and applicable data protection laws, you may have specific rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Access:</strong> You have the right to request access to the personal information we hold about you.</li>
                <li><strong>Right to Rectification:</strong> You have the right to request correction of any inaccurate or incomplete personal information.</li>
                <li><strong>Right to Erasure:</strong> You have the right to request deletion of your personal information, subject to certain exceptions.</li>
                <li><strong>Right to Restrict Processing:</strong> You have the right to request that we restrict the processing of your personal information under certain circumstances.</li>
                <li><strong>Right to Data Portability:</strong> You have the right to receive your personal information in a structured, machine-readable format.</li>
                <li><strong>Right to Object to Processing:</strong> You have the right to object to the processing of your personal information in certain situations.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p>
                The Petalog App is strictly intended for business operations and is not designed for or directed at individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently collected personal information from a child under 18, we will take immediate steps to delete such information promptly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Third-Party Links and Services</h2>
              <p>
                The App may contain links to third-party websites or services that are not operated by PETAERA TECHNOLOGIES LLP. This Privacy Policy does not apply to the practices of these third parties. We strongly advise you to review the privacy policy of every site or service you visit.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="mb-4">
                Your information, including personal data, may be transferred to and maintained on computers located outside of your jurisdiction where data protection laws may differ.
              </p>
              <p>
                PETAERA TECHNOLOGIES LLP is based in India. If you are located outside India and choose to provide information to us, please note that we transfer the data to India and process it there. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time to reflect changes in our practices, legal requirements, or the introduction of new features. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top. For material changes that significantly impact your rights, we will provide additional notice through the App or via email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <p className="mb-4">
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold">PETAERA TECHNOLOGIES LLP</p>
                <p><strong>Address:</strong> Sy No 232/6 Thekkumuri, Karalmanna, Palakkad, Kerala, India, 679506</p>
                <p><strong>Email:</strong> <a href="mailto:petaerallp@gmail.com" className="text-blue-600 hover:underline">petaerallp@gmail.com</a></p>
                <p><strong>Phone:</strong> +91 7012422309</p>
                <p><strong>Website:</strong> <a href="https://petaera.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">petaera.com</a></p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 