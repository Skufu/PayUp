import { memo } from 'react'
import { Check, LogIn, LogOut, MinusCircle, PlusCircle, Smartphone, UserMinus, UserPlus, X, type LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Activity = {
    id: string
    groupId: string
    userId: string
    userName: string
    userAvatar: string
    activityType: string
    description: string
    metadata: Record<string, unknown>
    createdAt: string
}

type Props = {
    activities: Activity[]
}

export const ActivityFeed = memo(function ActivityFeed({ activities }: Props) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-600">
                    <Smartphone size={24} />
                </div>
                <p className="text-gray-400 font-bold mb-1">No activity yet</p>
                <p className="text-xs text-gray-600 font-mono">Actions in this group will appear here!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4 p-4 md:p-6">
            {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    )
})

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
    member_joined: UserPlus,
    member_left: LogOut,
    member_removed: UserMinus,
    expense_created: PlusCircle,
    expense_updated: PlusCircle,
    expense_deleted: MinusCircle,
    payment_created: LogIn,
    payment_approved: Check,
    payment_rejected: X,
}

function ActivityItem({ activity }: { activity: Activity }) {
    const Icon = ACTIVITY_ICONS[activity.activityType] || Smartphone
    const colorClass = getActivityColor(activity.activityType)

    return (
        <div className="flex gap-4 p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass} bg-opacity-10 text-opacity-100 border border-current border-opacity-20`}>
                <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-relaxed">
                    {activity.description}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
            </div>
            {/* Decorative element */}
            <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-2xl opacity-10 ${colorClass.replace('text-', 'bg-')}`} />
        </div>
    )
}



function getActivityColor(type: string) {
    switch (type) {
        case 'member_joined':
            return 'text-[#dfff4f]'
        case 'member_left':
        case 'member_removed':
            return 'text-gray-500'
        case 'expense_created':
        case 'expense_updated':
            return 'text-[#dfff4f]'
        case 'expense_deleted':
            return 'text-[#ff4f99]'
        case 'payment_created':
            return 'text-blue-400'
        case 'payment_approved':
            return 'text-[#dfff4f]'
        case 'payment_rejected':
            return 'text-[#ff4f99]'
        default:
            return 'text-gray-400'
    }
}
