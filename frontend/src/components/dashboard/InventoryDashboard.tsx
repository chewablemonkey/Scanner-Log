import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../lib/api';
import { Item } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Badge } from '../ui/badge';
import { Search } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function InventoryDashboard() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    if (token) {
      fetchItems();
    }
  }, [token, page, search, category, location]);

  const fetchItems = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const skip = (page - 1) * itemsPerPage;
      const data = await api.getItems(token, {
        skip,
        limit: itemsPerPage,
        search: search || undefined,
        category: category || undefined,
        location: location || undefined,
      });
      
      setItems(data);
      
      const uniqueCategories = Array.from(
        new Set(data.map((item: Item) => item.category).filter(Boolean))
      );
      const uniqueLocations = Array.from(
        new Set(data.map((item: Item) => item.location).filter(Boolean))
      );
      
      if (uniqueCategories.length > 0) {
        setCategories(uniqueCategories as string[]);
      }
      
      if (uniqueLocations.length > 0) {
        setLocations(uniqueLocations as string[]);
      }
      
      setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!token) return;
    
    try {
      const blob = await api.exportItems(token, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: `Inventory data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
      toast({
        title: 'Export Failed',
        description: `Could not export inventory data as ${format.toUpperCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchItems();
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setLocation('');
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Inventory Dashboard</CardTitle>
          <CardDescription>Manage and track your inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')}>
              Export JSON
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                      <TableCell>
                        {item.quantity <= item.minQuantity ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <PaginationPrevious />
                  </Button>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <Button
                      variant={page === p ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <PaginationNext />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
