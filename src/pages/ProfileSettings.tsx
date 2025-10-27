import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Mail, BarChart3, TrendingUp, Upload, Image as ImageIcon } from "lucide-react";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";

interface TemplateOption {
  id: number;
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  previewColor: string;
  style: 'classic' | 'modern' | 'premium';
}

const templateOptions: TemplateOption[] = [
  {
    id: 1,
    name: "Classic Business",
    description: "Clean, professional layout with comprehensive data breakdown",
    features: [
      "Summary cards with key metrics",
      "Payment mode breakdown with UPI details", 
      "Service breakdown with percentages",
    ],
    icon: <Mail className="w-6 h-6" />,
    previewColor: "bg-gradient-to-br from-slate-50 to-slate-100",
    style: 'classic'
  },
  {
    id: 2,
    name: "Modern Analytics",
    description: "Chart-focused design with interactive visual elements",
    features: [
      "Modern card-based layout",
      "Enhanced data visualization",
      "Clean typography and spacing"
    ],
    icon: <BarChart3 className="w-6 h-6" />,
    previewColor: "bg-gradient-to-br from-blue-50 to-indigo-100",
    style: 'modern'
  },
  {
    id: 3,
    name: "Business Intelligence",
    description: "Premium design with advanced insights and gradient styling",
    features: [
      "Gradient-based visual design",
      "Advanced performance metrics",
      "Professional BI-style layout"
    ],
    icon: <TrendingUp className="w-6 h-6" />,
    previewColor: "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50",
    style: 'premium'
  }
];

export function ProfileSettings() {
  const { user } = useAuth();
  const selectedLocationId = useSelectedLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");

  useEffect(() => {
    const loadUserTemplate = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('templateno')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading template preference:', error);
          toast.error('Failed to load template preference');
        } else if (data?.templateno) {
          setSelectedTemplate(data.templateno);
        }
      } catch (error) {
        console.error('Error loading template preference:', error);
        toast.error('Failed to load template preference');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserTemplate();
  }, [user?.id]);

  useEffect(() => {
    const loadLocationLogo = async () => {
      if (!selectedLocationId) return;

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('name, logo_url')
          .eq('id', selectedLocationId)
          .single();

        if (!error && data) {
          setLocationName(data.name || "");
          setLogoUrl(data.logo_url || "");
        }
      } catch (error) {
        console.error('Error loading location logo:', error);
      }
    };

    loadLocationLogo();
  }, [selectedLocationId]);

  const handleSaveTemplate = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ templateno: selectedTemplate })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving template preference:', error);
        toast.error('Failed to save template preference');
      } else {
        toast.success('Template preference saved successfully!');
      }
    } catch (error) {
      console.error('Error saving template preference:', error);
      toast.error('Failed to save template preference');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !selectedLocationId) {
      toast.error('Please select a location first');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setLogoUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedLocationId}-${Date.now()}.${fileExt}`;
      const filePath = `location-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
          toast.error('Storage bucket not found. Please run the create_logo_storage_bucket.sql file in your Supabase SQL Editor.', {
            duration: 5000
          });
        } else {
          toast.error('Failed to upload logo: ' + uploadError.message);
        }
        
        setLogoUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Update location with logo URL
      const { error: updateError } = await supabase
        .from('locations')
        .update({ logo_url: publicUrl })
        .eq('id', selectedLocationId);

      if (updateError) {
        console.error('Error updating location:', updateError);
        toast.error('Failed to save logo URL');
      } else {
        setLogoUrl(publicUrl);
        toast.success('Logo uploaded successfully!');
      }
    } catch (error) {
      console.error('Error handling logo upload:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
      </div>

      {/* Location Logo Upload Section */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Location Logo</h2>
          <p className="text-muted-foreground">
            Upload a logo for your location. This logo will appear in the sidebar.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Current Logo Preview */}
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Location Logo"
                    className="w-32 h-32 object-contain rounded-lg border bg-muted p-2"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center rounded-lg border bg-muted">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">
                    {locationName && `Location: ${locationName}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload a logo image (PNG, JPG up to 2MB)
                  </p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploading || !selectedLocationId}
                    className="hidden"
                  />
                  <Button
                    asChild
                    disabled={logoUploading || !selectedLocationId}
                  >
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      {logoUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Report Templates Section */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Daily Report Template</h2>
          <p className="text-muted-foreground">
            Choose your preferred template for daily business reports sent to your email.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {templateOptions.map((template) => (
            <Card 
              key={template.id}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedTemplate === template.id 
                  ? 'ring-2 ring-primary shadow-md' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {selectedTemplate === template.id && (
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {template.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {template.style}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Template Preview */}
                <div className={`${template.previewColor} rounded-lg p-4 border`}>
                  <div className="space-y-3">
                    {/* Mock header */}
                    <div className={`h-3 rounded ${
                      template.style === 'classic' ? 'bg-slate-600' :
                      template.style === 'modern' ? 'bg-blue-600' :
                      'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`} />
                    
                    {/* Mock metrics cards */}
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded p-2 shadow-sm">
                          <div className="h-2 bg-gray-200 rounded mb-1" />
                          <div className="h-1 bg-gray-100 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Mock chart area */}
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="h-1 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="space-y-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <div className="h-1 bg-gray-100 rounded flex-1" />
                            <div className="h-1 bg-gray-100 rounded w-8" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Key Features:</h4>
                  <ul className="space-y-1 text-sm">
                    {template.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSaveTemplate}
            disabled={loading}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Placeholder for future settings sections */}
      <div className="pt-8 border-t">
      </div>
    </div>
  );
}