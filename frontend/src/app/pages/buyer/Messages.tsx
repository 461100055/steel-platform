import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { mockConversations, mockMessages, Conversation, Message } from '../../lib/mock-data';
import {
  Search,
  Send,
  MoreVertical,
  Archive,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    conversations[0] || null
  );
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversation]);

  const filteredConversations = conversations.filter((conv) =>
    conv.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = activeConversation
    ? messages.filter((msg) => msg.conversationId === activeConversation.id)
    : [];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    const message: Message = {
      id: `msg${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: 'buyer1',
      senderName: 'Ahmad Construction',
      senderRole: 'buyer',
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: true,
    };

    setMessages((prev) => [...prev, message]);

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation.id
          ? {
              ...conv,
              lastMessage: newMessage,
              lastMessageTime: message.timestamp,
            }
          : conv
      )
    );

    setNewMessage('');
  };

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowChatOnMobile(true);

    if (conversation.unreadCount > 0) {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id
            ? {
                ...conv,
                unreadCount: 0,
              }
            : conv
        )
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.conversationId === conversation.id
            ? {
                ...msg,
                read: true,
              }
            : msg
        )
      );
    }
  };

  const handleArchiveConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              status: 'archived' as const,
            }
          : conv
      )
    );

    if (activeConversation?.id === conversationId) {
      const nextConversation =
        conversations.find((conv) => conv.id !== conversationId && conv.status !== 'archived') ||
        conversations[0] ||
        null;

      setActiveConversation(nextConversation);
      setShowChatOnMobile(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (diffInHours < 48) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderConversationsList = () => (
    <div
      className={`flex h-full flex-col border-[#E5E7EB] bg-white lg:w-1/3 lg:border-r ${
        showChatOnMobile ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <CardHeader className="border-b border-[#E5E7EB] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conversation) => (
          <button
            type="button"
            key={conversation.id}
            onClick={() => handleConversationClick(conversation)}
            className={`flex w-full cursor-pointer items-start gap-3 border-b border-[#E5E7EB] p-4 text-left transition-colors hover:bg-[#F9FAFB] ${
              activeConversation?.id === conversation.id ? 'bg-[#BDE8F5]/20' : ''
            }`}
          >
            <Avatar className="h-11 w-11 shrink-0 md:h-12 md:w-12">
              <AvatarImage
                src={conversation.supplierImage}
                alt={conversation.supplierName}
              />
              <AvatarFallback className="bg-[#4988C4] text-white">
                {conversation.supplierName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold text-[#111827]">
                  {conversation.supplierName}
                </h3>
                <span className="shrink-0 text-xs text-[#6B7280]">
                  {formatTime(conversation.lastMessageTime)}
                </span>
              </div>

              <p className="truncate text-sm text-[#6B7280]">
                {conversation.lastMessage}
              </p>
            </div>

            {conversation.unreadCount > 0 && (
              <Badge className="shrink-0 bg-[#0F2854] text-white">
                {conversation.unreadCount}
              </Badge>
            )}
          </button>
        ))}

        {filteredConversations.length === 0 && (
          <div className="flex h-full min-h-[260px] items-center justify-center px-4 text-center text-[#6B7280]">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );

  const renderMessagesPanel = () => {
    if (!activeConversation) {
      return (
        <div
          className={`flex flex-1 items-center justify-center bg-white text-[#6B7280] ${
            showChatOnMobile ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="px-6 text-center">
            <MessageSquare className="mx-auto mb-4 h-16 w-16 text-[#E5E7EB]" />
            <h3 className="mb-2 text-lg font-semibold text-[#111827]">
              No Conversation Selected
            </h3>
            <p className="text-sm text-[#6B7280]">
              Select a conversation from the list to view messages
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`min-w-0 flex-1 flex-col bg-white ${
          showChatOnMobile ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <CardHeader className="border-b border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowChatOnMobile(false)}
                className="shrink-0 lg:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage
                  src={activeConversation.supplierImage}
                  alt={activeConversation.supplierName}
                />
                <AvatarFallback className="bg-[#4988C4] text-white">
                  {activeConversation.supplierName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h2 className="truncate font-semibold text-[#111827]">
                  {activeConversation.supplierName}
                </h2>
                <p className="text-sm text-[#6B7280]">Supplier</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleArchiveConversation(activeConversation.id)}
                  className="text-[#6B7280]"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {activeMessages.map((message) => {
            const isBuyer = message.senderRole === 'buyer';

            return (
              <div
                key={message.id}
                className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl p-3 md:max-w-[70%] md:p-4 ${
                    isBuyer
                      ? 'bg-[#0F2854] text-white'
                      : 'bg-[#F3F4F6] text-[#111827]'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content}
                  </p>

                  <p
                    className={`mt-2 text-xs ${
                      isBuyer ? 'text-[#BDE8F5]' : 'text-[#6B7280]'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t border-[#E5E7EB] p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[90px] resize-none md:min-h-[78px]"
              rows={3}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="w-full bg-[#0F2854] px-6 hover:bg-[#1C4D8D] md:w-auto"
            >
              <Send className="mr-2 h-5 w-5 md:mr-0" />
              <span className="md:hidden">Send</span>
            </Button>
          </div>

          <p className="mt-2 hidden text-xs text-[#6B7280] md:block">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <div className="mb-5 md:mb-8">
          <h1 className="text-2xl font-bold text-[#0F2854] md:text-3xl">
            Messages
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            View and manage your conversations with suppliers.
          </p>
        </div>

        <Card className="h-[calc(100vh-190px)] min-h-[560px] overflow-hidden md:h-[calc(100vh-220px)]">
          <div className="flex h-full min-w-0">
            {renderConversationsList()}
            {renderMessagesPanel()}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}