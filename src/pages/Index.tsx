import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Database, Gauge, Gift, Download, Zap, Eye, BarChart3, Car, Truck, Building, Warehouse, Shield, Users, Timer, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Clear any existing user data when landing page loads
  useEffect(() => {
    // Always clear user data when landing page loads to ensure clean state
    localStorage.removeItem('user');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/uploads/Logo only white bg.png" 
              alt="PetaLog Logo" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">PetaLog</h1>
              <p className="text-xs text-gray-600">Track. Log. Know.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('/uploads/7d65fa7c-8d53-493e-b2a3-26c6e62d7471.png')`
            }}
          />
          <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <Badge className="mb-6 bg-blue-600/90 text-white px-4 py-2 text-sm">
              Smart Vehicle Logging Platform
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Automate, Analyse, <span className="text-blue-400">Accelerate</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
              Smarter Vehicle Logging for Fuel Stations, Car Washes, Warehouses & Crusher Yards
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to automate vehicle tracking and optimize operations
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Auto Logging</CardTitle>
                  <CardDescription>
                    Capture vehicle entry/exit with real-time images and number plate detection
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Eye className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Smart Filters</CardTitle>
                  <CardDescription>
                    Find logs by time, vehicle type, tag, duration and more
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Centralised Storage</CardTitle>
                  <CardDescription>
                    All logs stored securely with visual proof and timestamps
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Gauge className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>Live Dashboard</CardTitle>
                  <CardDescription>
                    Real-time monitoring of vehicle movements with stats
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <Gift className="w-6 h-6 text-pink-600" />
                  </div>
                  <CardTitle>Loyalty Friendly</CardTitle>
                  <CardDescription>
                    Recognize repeat visits and reward frequent customers
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Download className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>API + Export</CardTitle>
                  <CardDescription>
                    Seamless integration with your CRM and report generation
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Perfect for Every Industry</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From fuel stations to warehouses, PetaLog adapts to your specific needs
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <div className="flex items-center mb-4">
                  <Car className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">Petrol Pumps</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Identify repeat visitors and optimize refueling efficiency. Track customer patterns and reduce wait times with intelligent queue management.
                </p>
              </div>
              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/uploads/a7fd190a-84fd-4a4f-8237-e6b4e5057e63.png" 
                  alt="Fuel pump filling"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg lg:order-1">
                <img 
                  src="/uploads/012413d8-cbe0-4aea-b9d6-0d8b925a8bec.png" 
                  alt="Car wash blue car"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:order-2">
                <div className="flex items-center mb-4">
                  <Car className="w-8 h-8 text-green-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">Car Wash Centres</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Track vehicle wash durations and streamline queue management. Monitor service times and optimize workflow for maximum efficiency.
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <div className="flex items-center mb-4">
                  <Truck className="w-8 h-8 text-orange-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">Crusher Yards / Stone Quarries</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Log truck movements, load times, and outbound records visually. Maintain detailed records for compliance and operational efficiency.
                </p>
              </div>
              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/uploads/74a5e5a3-5308-4d9e-a6fd-0206fe655670.png" 
                  alt="Crusher yard with truck and loader"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg lg:order-1">
                <img 
                  src="/uploads/4eb36170-df4f-40c7-b9f5-d22b6b587351.png" 
                  alt="Warehouse storage"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:order-2">
                <div className="flex items-center mb-4">
                  <Warehouse className="w-8 h-8 text-purple-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">Storage Godowns / Warehouses</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Monitor goods vehicle in-out logs for traceability and audits. Ensure complete visibility of inventory movements and delivery schedules.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">How it Works</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Simple 3-step process to automate your vehicle logging
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Image Capture</h3>
                <p className="text-gray-600">
                  IP cameras capture continuous snapshots at key locations
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Eye className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Detection</h3>
                <p className="text-gray-600">
                  AI detects number plates, vehicle type, and entry/exit events
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Instant Insights</h3>
                <p className="text-gray-600">
                  Dashboard updates instantly with new logs and analytics
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to streamline your operations?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Let your IP camera do the logging. You focus on growth.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg">
                Get Started Today
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <img 
                    src="/uploads/Logo only white bg.png" 
                    alt="PetaLog Logo" 
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <h3 className="text-lg font-bold">PetaLog</h3>
                    <p className="text-sm text-gray-400">Track. Log. Know.</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-4">
                  Smart vehicle logging platform for modern businesses.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-4">Download</h4>
                <div className="space-y-3">
                  <a href="#" className="block">
                    <img 
                      src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                      alt="Download on App Store"
                      className="h-10"
                    />
                  </a>
                  <a href="#" className="block">
                    <img 
                      src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                      alt="Get it on Google Play"
                      className="h-10"
                    />
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
              <p>&copy; 2025 PetaEra Technologies. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
  );
};

export default Index; 