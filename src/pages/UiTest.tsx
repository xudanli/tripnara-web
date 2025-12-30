import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CheckCircle2, Info, XCircle } from "lucide-react"

export default function UiTestPage() {
  const [progress, setProgress] = useState(33)
  const [sliderValue, setSliderValue] = useState([50])

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">shadcn/ui 组件展示页面</h1>
          <p className="text-muted-foreground">
            展示所有已安装的 shadcn/ui 组件
          </p>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Button 按钮</h2>
          <div className="flex flex-wrap gap-4">
            <Button>默认</Button>
            <Button variant="destructive">危险</Button>
            <Button variant="outline">轮廓</Button>
            <Button variant="secondary">次要</Button>
            <Button variant="ghost">幽灵</Button>
            <Button variant="link">链接</Button>
            <Button size="sm">小号</Button>
            <Button size="lg">大号</Button>
            <Button disabled>禁用</Button>
          </div>
        </section>

        <Separator />

        {/* Form Elements */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">表单元素</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea">文本域</Label>
                <Textarea id="textarea" placeholder="输入一些文字..." />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">同意条款</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="notifications" />
                <Label htmlFor="notifications">启用通知</Label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>选择选项</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个选项" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">选项 1</SelectItem>
                    <SelectItem value="option2">选项 2</SelectItem>
                    <SelectItem value="option3">选项 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>单选按钮</Label>
                <RadioGroup defaultValue="option1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="r1" />
                    <Label htmlFor="r1">选项 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="r2" />
                    <Label htmlFor="r2">选项 2</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Card 卡片</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>卡片标题</CardTitle>
                <CardDescription>卡片描述</CardDescription>
              </CardHeader>
              <CardContent>
                <p>这是卡片内容</p>
              </CardContent>
              <CardFooter>
                <Button>操作</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>另一个卡片</CardTitle>
                <CardDescription>展示不同的内容</CardDescription>
              </CardHeader>
              <CardContent>
                <p>更多信息</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>简单卡片</CardTitle>
              </CardHeader>
              <CardContent>
                <p>只有内容</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Badges & Avatars */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Badge 和 Avatar</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Badge>默认</Badge>
            <Badge variant="secondary">次要</Badge>
            <Badge variant="destructive">危险</Badge>
            <Badge variant="outline">轮廓</Badge>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </section>

        <Separator />

        {/* Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Alert 警告</h2>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>信息</AlertTitle>
              <AlertDescription>这是一条信息提示</AlertDescription>
            </Alert>
            <Alert variant="default">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>成功</AlertTitle>
              <AlertDescription>操作成功完成</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>发生了错误</AlertDescription>
            </Alert>
          </div>
        </section>

        <Separator />

        {/* Progress & Slider */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">进度和滑块</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>进度条: {progress}%</Label>
              <Progress value={progress} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>-</Button>
                <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>+</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>滑块: {sliderValue[0]}</Label>
              <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
            </div>
          </div>
        </section>

        <Separator />

        {/* Dialog & Popover */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">对话框和弹出框</h2>
          <div className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">打开对话框</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>对话框标题</DialogTitle>
                  <DialogDescription>
                    这是对话框的描述内容
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p>对话框内容</p>
                </div>
                <DialogFooter>
                  <Button variant="outline">取消</Button>
                  <Button>确认</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">打开弹出框</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <h4 className="font-medium">弹出框标题</h4>
                  <p className="text-sm text-muted-foreground">
                    这是弹出框的内容
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">下拉菜单</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人资料</DropdownMenuItem>
                <DropdownMenuItem>设置</DropdownMenuItem>
                <DropdownMenuItem>登出</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        <Separator />

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tabs 标签页</h2>
          <Tabs defaultValue="account" className="w-full">
            <TabsList>
              <TabsTrigger value="account">账户</TabsTrigger>
              <TabsTrigger value="password">密码</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-2">
              <p>账户设置内容</p>
            </TabsContent>
            <TabsContent value="password" className="space-y-2">
              <p>密码设置内容</p>
            </TabsContent>
            <TabsContent value="settings" className="space-y-2">
              <p>其他设置内容</p>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* Accordion */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Accordion 手风琴</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>第一个项目</AccordionTrigger>
              <AccordionContent>
                这是第一个项目的详细内容
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>第二个项目</AccordionTrigger>
              <AccordionContent>
                这是第二个项目的详细内容
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>第三个项目</AccordionTrigger>
              <AccordionContent>
                这是第三个项目的详细内容
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator />

        {/* Table */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Table 表格</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>张三</TableCell>
                <TableCell>zhang@example.com</TableCell>
                <TableCell><Badge>管理员</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm">编辑</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>李四</TableCell>
                <TableCell>li@example.com</TableCell>
                <TableCell><Badge variant="secondary">用户</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm">编辑</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>王五</TableCell>
                <TableCell>wang@example.com</TableCell>
                <TableCell><Badge variant="outline">访客</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm">编辑</Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <Separator />

        {/* Skeleton */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Skeleton 骨架屏</h2>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </section>

        <Separator />

        {/* Other Components */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">其他组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Tooltip (需要悬停)</h3>
                <p className="text-sm text-muted-foreground">
                  某些组件需要特定的交互才能显示，如 Tooltip, HoverCard 等
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">已安装的组件</h3>
                <p className="text-sm text-muted-foreground">
                  所有主要组件已安装并在此页面展示。如需查看特定组件的详细信息，请查看组件文档。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
