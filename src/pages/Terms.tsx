import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function Terms() {
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
            <CardTitle className="text-3xl font-bold">PetaLog : Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last Updated: July 27, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <p className="text-lg">
                These Terms of Service ("Terms") constitute a legally binding agreement between you, the client ("Client," "You," or "Your"), and PETAERA TECHNOLOGIES ("PETAERA," "We," "Us," or "Our"), governing Your access to and use of the PetaLog mobile application, associated software, hardware, and services (collectively, the "Service").
              </p>
              <p className="text-lg">
                By accessing or using the Service, You acknowledge that You have read, understood, and agree to be bound by these Terms. If You do not agree with any part of these Terms, You must not use the Service.
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
                <p>
                  PetaLog is an advanced, automated vehicle logging and management system designed for various commercial sites, including but not limited to car wash centers, fuel stations, godowns, and crusher yards etc. The Service leverages Automatic Number Plate Recognition (ANPR) technology to automatically capture and log vehicle information, providing comprehensive management dashboards, reporting, and analytics to streamline Your operations and enhance efficiency.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Acceptance of Terms</h2>
                <p>
                  By subscribing to, installing, accessing, or using any part of the PetaLog Service, You confirm Your acceptance of these Terms. These Terms apply to all users of the Service, including without limitation users who are browsers, vendors, customers, merchants, and/ or contributors of content.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Service Description</h2>
                <p className="mb-4">The PetaLog Service comprises:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Automated Vehicle Logging:</strong> An ANPR system installed at Your designated site(s) (e.g., car wash, fuel station, godown, crusher yard) that automatically captures vehicle images and processes number plates from network cameras. This data is then synced with our central server to create automatic logs.</li>
                  <li><strong>Management Dashboard:</strong> A comprehensive web-based and/or mobile application dashboard providing features such as:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Manual vehicle entry by authorized personnel (e.g., managers).</li>
                      <li>Comparison and reconciliation of automatic and manual logs.</li>
                      <li>Price settings and management.</li>
                      <li>User and access level settings for Your staff.</li>
                      <li>Vehicle-wise history tracking.</li>
                      <li>Detailed reports and analytics to provide insights into vehicle flow and operations.</li>
                    </ul>
                  </li>
                  <li><strong>Industry-Specific Customizations:</strong> While a general prototype exists, PetaLog can be adapted and enhanced to provide exclusive features tailored to specific industry needs (e.g., loyalty-based systems for fuel stations) upon request, which may incur additional charges.</li>
                  <li><strong>Hardware Components:</strong> Provision of necessary PetaLog system hardware components, including the core processing unit and its enclosures.</li>
                  <li><strong>Software Configuration:</strong> Configuration and setup of the ANPR software and management application.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Hardware and Software Provision</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4.1. Peta Era Provided Components</h3>
                    <p>PETAERA will provide the core PetaLog system hardware (e.g., processing unit, cooling fans, enclosure) and configure the ANPR software and management application.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4.2. Third-Party Components</h3>
                    <p>Necessary components such as network cameras, internet routers, and associated cabling may be provided by PETAERA or sourced by the Client from third parties.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4.3. Ownership</h3>
                    <p>Ownership of all hardware components provided by PETAERA, including the PetaLog system hardware, transfers solely to the Client upon full payment of the initial hardware cost.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4.4. Liability for Third-Party Components</h3>
                    <p>PETAERA shall only be liable for the functionality and warranty of hardware components directly sold and provided by PETAERA. PETAERA bears no liability for the installation, functionality, or maintenance of third-party hardware (e.g., CCTV cameras, routers) not supplied by PETAERA.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Data Privacy and Usage</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">5.1. Data Collection</h3>
                    <p>The ANPR system automatically captures vehicle images and number plate data. This data is processed on-site and then securely synced with PETAERA's servers.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">5.2. Data Storage</h3>
                    <p>Captured images and associated log data will be stored for a period as per the Client's requirements and technical feasibilities. Data will be periodically cleared from the servers in accordance with agreed-upon retention policies.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">5.3. Data Usage</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Client Use:</strong> The collected data is primarily for the Client's internal operational logging, management, reporting, and analytics.</li>
                      <li><strong>Internal PETAERA Use:</strong> PETAERA reserves the right to use collected data (specifically vehicle images and ANPR results) internally for the sole purpose of improving and enhancing the performance and accuracy of Our ANPR technology and overall Service. This internal use will not involve sharing identifiable Client or vehicle data with any external parties.</li>
                      <li><strong>No Sharing/Leakage:</strong> PETAERA commits to not sharing or leaking Your collected data, including vehicle images or logs, with any unauthorized third parties.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">5.4. Client Responsibility for Data Compliance</h3>
                    <p>The Client is solely responsible for ensuring that the collection and use of vehicle data at their site(s) comply with all applicable local, national, and international data protection and privacy laws and regulations (e.g., CCTV regulations, privacy notices).</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. User Responsibilities</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">6.1. Infrastructure</h3>
                    <p>The Client is responsible for providing the necessary site infrastructure, including stable power supply, reliable internet connectivity, and suitable mounting locations for cameras and the PetaLog system hardware.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">6.2. Installation Support</h3>
                    <p>The Client shall arrange for qualified personnel (e.g., a CCTV mechanic/team) to handle the physical installation of network cameras and the integration of the PetaLog system hardware with the site's existing infrastructure. Alternatively, PETAERA can arrange such personnel, in which case the Client acknowledges that PETAERA's liability is limited to the PetaLog system itself, and the arranged personnel are solely responsible for the goods and services they provide.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">6.3. System Use</h3>
                    <p>The Client is responsible for the proper use of the PetaLog Service by its authorized personnel, including accurate manual data entry and adherence to security protocols.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">6.4. Account Security</h3>
                    <p>The Client is responsible for maintaining the confidentiality of login credentials and for all activities that occur under their account.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">6.5. Compliance</h3>
                    <p>The Client must ensure that their use of the PetaLog Service complies with all applicable laws, regulations, and industry standards.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Pricing and Payment Responsibility</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.1. Initial Costs</h3>
                    <p>The Client shall pay an initial fixed amount for the PetaLog system hardware and its ANPR software configuration. A separate cost will be charged for the management software.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.2. Multiple Site Pricing</h3>
                    <p>For Clients operating multiple locations (e.g., multiple car washes, fuel stations), rates for both hardware and software will be set accordingly, reflecting additional deployments.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.3. Feature-Based Pricing</h3>
                    <p>As new features are developed and added to the Service, or if exclusive features are provided to a Client upon request, the overall amount or subscription fees may vary and will be communicated to the Client.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.4. Annual Maintenance Cost (AMC)</h3>
                    <p>An Annual Maintenance Cost (AMC) will be determined and communicated to the Client at the time of installation. The AMC is mandatory for continued service and support.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.5. Payment Terms</h3>
                    <p>All payment terms, including due dates and accepted payment methods, will be specified in a separate agreement or invoice.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">7.6. Pricing Discretion</h3>
                    <p>All pricing, including initial costs, AMC and charges for additional features or services, is at the sole discretion of PETAERA TECHNOLOGIES and may be subject to change with prior notice.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Maintenance Policy</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">8.1. Hardware Warranty</h3>
                    <p>PETAERA provides a 6-month warranty on the core PetaLog system hardware components (e.g., processing unit, cooling fans, enclosure) from the date of installation. During this period, PETAERA will replace or repair faulty components at no additional charge.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">8.2. Periodic Maintenance</h3>
                    <p>PETAERA will conduct periodic inspections and cleaning of the PetaLog system hardware to ensure its optimal functionality. The frequency and scope of these inspections will be determined by PETAERA.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">8.3. Software Error Correction (Under AMC)</h3>
                    <p>Under the active AMC, Peta Era will address and correct software errors within the PetaLog system and the web/mobile management application to restore full functionality.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">8.4. Hardware Maintenance Post-Warranty/Out of AMC</h3>
                    <p>After the initial 6-month warranty period, or if the AMC is not active, any hardware failures (including the core processing unit) will incur charges for replacement components and associated service. PETAERA is not liable for hardware components not sold by us.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">8.5. Exclusions</h3>
                    <p>PETAERA is not responsible for issues arising from:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Damage caused by misuse, accidents, unauthorized modifications, or improper installation by third parties.</li>
                      <li>Failures of third-party components (e.g., CCTV cameras, routers) not supplied by PETAERA.</li>
                      <li>Issues related to Client's internet connectivity or power supply.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">9.1. General Limitation</h3>
                    <p>To the maximum extent permitted by applicable law, PETAERA TECHNOLOGIES, its affiliates, directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Your access to or use of or inability to access or use the Service.</li>
                      <li>any conduct or content of any third party on the Service.</li>
                      <li>any content obtained from the Service.</li>
                      <li>unauthorized access, use or alteration of Your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not We have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">9.2. Third-Party Components</h3>
                    <p>PETAERA explicitly disclaims any liability for damages or issues arising from the failure, malfunction, or improper installation of third-party hardware or software components not directly supplied or developed by PETAERA.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">9.3. Data Discrepancies</h3>
                    <p>While PetaLog aims for high accuracy, PETAERA is not liable for any financial losses or operational discrepancies arising from minor inaccuracies or temporary failures in automatic logging, provided PETAERA addresses system failures as per the Maintenance Policy.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">10. Government Compliances</h2>
                <p>
                  The Client is solely responsible for ensuring that the operation of the PetaLog system at their site(s), including the use of ANPR technology and data collection practices, complies with all relevant local, state, and national government regulations, licenses, and permits. This includes, but is not limited to, data privacy laws, surveillance regulations, and business operational licenses. PETAERA provides the technology but does not guarantee the Client's compliance with specific regulatory requirements applicable to their business type or location.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">11. Termination of Service</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">11.1. By Client</h3>
                    <p>The Client may terminate their use of the Service by providing written notice to PETAERA, subject to any minimum contract periods or outstanding payment obligations.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">11.2. By PETAERA</h3>
                    <p>PETAERA may suspend or terminate Your access to the Service immediately, without prior notice or liability, if You breach these Terms, including but not limited to failure to pay fees when due or misuse of the Service.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">11.3. Effect of Termination</h3>
                    <p>Upon termination, Your right to use the Service will immediately cease. All outstanding payments will become immediately due. PETAERA may delete Your data from its servers after a reasonable period following termination, in accordance with its data retention policies.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">12. Dispute Resolution & Conflict Management</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">12.1. Informal Resolution</h3>
                    <p>In the event of any dispute or claim arising out of or relating to these Terms or the Service, the parties agree to first attempt to resolve the matter amicably through good faith discussions.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">12.2. PETAERA's Role in Conflicts</h3>
                    <p>In situations involving a high amount of conflict between the Client and a third party (e.g., issues with third-party installers, data discrepancies leading to disputes), PETAERA will endeavor to mediate or assist in resolving the conflict, acting as a neutral party to facilitate a resolution where appropriate, but without assuming legal responsibility for the actions or inactions of third parties.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">12.3. Formal Resolution</h3>
                    <p>If an amicable resolution cannot be reached, disputes shall be resolved through binding arbitration or litigation as specified in the Governing Law & Jurisdiction section.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">13. Governing Law & Jurisdiction</h2>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any dispute, controversy, or claim arising out of or relating to these Terms or the Service, including the breach, termination, or validity thereof, shall be exclusively subject to the jurisdiction of the courts located in Palakkad, Kerala, India.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">14. Amendments to Terms</h2>
                <p>
                  PETAERA reserves the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material, We will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion. By continuing to access or use Our Service after those revisions become effective, You agree to be bound by the revised terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">15. Intellectual Property</h2>
                <p>
                  All intellectual property rights in the PetaLog software, ANPR technology, and the Service (excluding any Client content) are owned by PETAERA TECHNOLOGIES. You are granted a limited, non-exclusive, non-transferable license to use the Service in accordance with these Terms. You may not copy, modify, distribute, sell, or lease any part of Our Service or included software, nor may You reverse engineer or attempt to extract the source code of that software.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold">PETAERA TECHNOLOGIES LLP</p>
                  <p><strong>Email:</strong> <a href="mailto:petaerallp@gmail.com" className="text-blue-600 hover:underline">petaerallp@gmail.com</a></p>
                  <p><strong>Phone:</strong> +91 7012422309</p>
                  <p><strong>Website:</strong> <a href="https://petaera.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Petaera.com</a></p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 