import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Mail, BarChart3, TrendingUp } from "lucide-react";

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
      "Vehicle distribution charts",
      "Hourly sales visualization"
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
      "Advanced pie charts for distributions",
      "Bar charts for hourly analysis",
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
      "Key insights and recommendations",
      "Advanced performance metrics",
      "Interactive hourly performance charts",
      "Professional BI-style layout"
    ],
    icon: <TrendingUp className="w-6 h-6" />,
    previewColor: "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50",
    style: 'premium'
  }
];

export function ProfileSettings() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Customize your account preferences and report settings.
        </p>
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
        <div className="text-center text-muted-foreground">
          <p className="text-sm">More settings options will be available here in the future.</p>
        </div>
      </div>
    </div>
  );
}