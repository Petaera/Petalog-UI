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
              PetaParking Mobile App
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              <strong>Effective Date:</strong> 05-04-2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="mb-4">
                This Privacy Policy describes how <strong>PetaParking</strong> ("we", "our", or "us") collects, uses, and shares information about you through our mobile application ("App"), designed specifically for parking lot management.
              </p>
              <p>
                By downloading, accessing, or using the App, you agree to this Privacy Policy and Terms & Conditions. If you disagree with any part of these terms, you must not use the App.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-3">Personal Information</h3>
              <p className="mb-4">
                When you register or use our App, we may collect your email address, name, phone number, vehicle details, and other contact or identification information you voluntarily provide.
              </p>

              <h3 className="text-xl font-medium mb-3">Usage Data</h3>
              <p className="mb-4">
                We automatically collect data such as device type, IP address, browser type, and details about your interaction with the App.
              </p>

              <h3 className="text-xl font-medium mb-3">Parking Data</h3>
              <p className="mb-4">
                The App collects data relating to vehicle entries, exits, parking duration, and related financial transactions.
              </p>

              <h3 className="text-xl font-medium mb-3">Cookies & Tracking Technologies</h3>
              <p>
                The embedded web application within our App may use cookies or similar tracking technologies to enhance user experience.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Data Ownership</h2>
              <p>
                All collected data is exclusively owned by the respective parking lot owner. Each parking lot owner is provided with a separate server instance, and all information collected is maintained independently for each owner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To manage parking lot entries and exits effectively.</li>
                <li>To process transactions and calculate parking fees.</li>
                <li>To provide, maintain, and improve our App and parking management services.</li>
                <li>To communicate important updates, support messages, and promotional materials.</li>
                <li>To ensure security and compliance with parking lot rules.</li>
                <li>To comply with legal obligations and enforce our Terms & Conditions.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Sharing of Your Information</h2>
              <p className="mb-4">
                We do not sell or rent personal information. We may share your data with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Parking lot owners or authorized employees for management purposes.</li>
                <li>Trusted third-party service providers necessary for the App's functionality.</li>
                <li>Authorities, when required by law or to protect our rights and security.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Security</h2>
              <p>
                We implement reasonable measures to protect your personal data, but no method of transmission or electronic storage is 100% secure. While we strive to protect your information, absolute security cannot be guaranteed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Third-Party Links</h2>
              <p>
                Our App may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those external websites.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
              <p>
                Our App is not intended for use by individuals under the age of 13. We do not knowingly collect data from children under 13. If we become aware of such data collection, we will promptly delete it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Changes to this Policy</h2>
              <p>
                We reserve the right to update this Privacy Policy. Any changes will be reflected here, with the "Effective Date" updated accordingly. Continued use of the App constitutes acceptance of these changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="mb-4">
                If you have questions about this Privacy Policy or Terms & Conditions, please contact us at:
              </p>
              <p className="font-medium text-blue-600">
                <a href="mailto:Petaerallp@gmail.com" className="hover:underline">
                  Petaerallp@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Acceptance</h2>
              <p>
                By using the App, you signify your acceptance of this Privacy Policy and Terms & Conditions. If you do not agree, please do not use our App.
              </p>
            </section>

            <div className="border-t pt-6 mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                This privacy policy is based on the content from{' '}
                <a 
                  href="https://petaera.com/PetaParking_privacy/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://petaera.com/PetaParking_privacy/
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 