import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Star, Trophy, Users, Calendar, TrendingUp } from "lucide-react";

export default function Loyalty() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loyalty Program</h1>
          <p className="text-muted-foreground">
            Manage customer loyalty rewards and incentives
          </p>
        </div>
        <Button>
          <Gift className="mr-2 h-4 w-4" />
          Add Reward
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Redeemed</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,678</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Given</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              +5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Rewards</CardTitle>
            <CardDescription>
              Latest loyalty rewards and redemptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">Redeemed 500 points</p>
                </div>
              </div>
              <Badge variant="secondary">Free Parking</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Jane Smith</p>
                  <p className="text-xs text-muted-foreground">Earned 100 points</p>
                </div>
              </div>
              <Badge variant="outline">Visit Bonus</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Mike Johnson</p>
                  <p className="text-xs text-muted-foreground">Achieved Gold Status</p>
                </div>
              </div>
              <Badge variant="default">Gold Member</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              Special loyalty program events and promotions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Double Points Weekend</p>
                <p className="text-xs text-muted-foreground">Dec 15-17, 2024</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Holiday Special Rewards</p>
                <p className="text-xs text-muted-foreground">Dec 20-31, 2024</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">New Year Bonus</p>
                <p className="text-xs text-muted-foreground">Jan 1, 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tiers</CardTitle>
          <CardDescription>
            Current loyalty program tiers and benefits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline">Bronze</Badge>
                <span className="text-sm text-muted-foreground">0-999 points</span>
              </div>
              <ul className="text-sm space-y-1">
                <li>• 1 point per visit</li>
                <li>• Basic parking discounts</li>
                <li>• Monthly newsletter</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary">Silver</Badge>
                <span className="text-sm text-muted-foreground">1000-4999 points</span>
              </div>
              <ul className="text-sm space-y-1">
                <li>• 1.5 points per visit</li>
                <li>• Enhanced parking discounts</li>
                <li>• Priority customer support</li>
                <li>• Birthday rewards</li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default">Gold</Badge>
                <span className="text-sm text-muted-foreground">5000+ points</span>
              </div>
              <ul className="text-sm space-y-1">
                <li>• 2 points per visit</li>
                <li>• Maximum parking discounts</li>
                <li>• VIP customer support</li>
                <li>• Exclusive events access</li>
                <li>• Free premium services</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
