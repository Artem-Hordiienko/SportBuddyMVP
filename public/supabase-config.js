// Supabase Configuration for SportBuddy MVP
// This file contains the database schema and configuration for Supabase

const SUPABASE_CONFIG = {
    // Replace with your actual Supabase project URL and anon key
    url: 'https://rpfzsknxkdppzstvvdiw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwZnpza254a2RwcHpzdHZ2ZGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzE1OTIsImV4cCI6MjA3NDY0NzU5Mn0.L0LlR57X6U821IR5NI3mP1VmSgXO2jzOgbV2fwW9yjM'
};

// Database Schema
const DATABASE_SCHEMA = {
    // Users table
    users: {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        email: 'varchar(255) UNIQUE NOT NULL',
        name: 'varchar(100) NOT NULL',
        age: 'integer CHECK (age >= 16 AND age <= 100)',
        gender: 'varchar(20) CHECK (gender IN (\'male\', \'female\', \'other\'))',
        sport_goals: 'varchar(100)',
        experience_level: 'varchar(20) CHECK (experience_level IN (\'beginner\', \'intermediate\', \'advanced\'))',
        avatar: 'varchar(500)', // URL to avatar image
        bio: 'text',
        created_at: 'timestamp with time zone DEFAULT now()',
        updated_at: 'timestamp with time zone DEFAULT now()'
    },
    
    // Swipes table
    swipes: {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        from_user: 'uuid REFERENCES users(id) ON DELETE CASCADE',
        to_user: 'uuid REFERENCES users(id) ON DELETE CASCADE',
        direction: 'varchar(10) CHECK (direction IN (\'like\', \'skip\'))',
        created_at: 'timestamp with time zone DEFAULT now()',
        UNIQUE(from_user, to_user) // Prevent duplicate swipes
    },
    
    // Matches table
    matches: {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        user_a: 'uuid REFERENCES users(id) ON DELETE CASCADE',
        user_b: 'uuid REFERENCES users(id) ON DELETE CASCADE',
        created_at: 'timestamp with time zone DEFAULT now()',
        UNIQUE(user_a, user_b) // Prevent duplicate matches
    },
    
    // Messages table
    messages: {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        match_id: 'uuid REFERENCES matches(id) ON DELETE CASCADE',
        sender_id: 'uuid REFERENCES users(id) ON DELETE CASCADE',
        text: 'text NOT NULL',
        created_at: 'timestamp with time zone DEFAULT now()'
    },
    
    // User preferences table (for future premium features)
    user_preferences: {
        id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        user_id: 'uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE',
        age_min: 'integer DEFAULT 18',
        age_max: 'integer DEFAULT 50',
        gender_preference: 'varchar(20) CHECK (gender_preference IN (\'male\', \'female\', \'any\'))',
        sport_preference: 'varchar(100)',
        experience_preference: 'varchar(20)',
        max_distance: 'integer DEFAULT 50', // in kilometers
        created_at: 'timestamp with time zone DEFAULT now()',
        updated_at: 'timestamp with time zone DEFAULT now()'
    }
};

// Row Level Security (RLS) Policies
const RLS_POLICIES = {
    users: [
        // Users can view all profiles
        'CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true)',
        // Users can only update their own profile
        'CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id)',
        // Users can only insert their own profile
        'CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id)'
    ],
    
    swipes: [
        // Users can view their own swipes
        'CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT USING (auth.uid() = from_user)',
        // Users can insert their own swipes
        'CREATE POLICY "Users can insert own swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = from_user)'
    ],
    
    matches: [
        // Users can view matches they are part of
        'CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b)',
        // System can insert matches (handled by triggers)
        'CREATE POLICY "System can insert matches" ON matches FOR INSERT WITH CHECK (true)'
    ],
    
    messages: [
        // Users can view messages from their matches
        'CREATE POLICY "Users can view match messages" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())))',
        // Users can insert messages to their matches
        'CREATE POLICY "Users can insert match messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM matches WHERE matches.id = messages.match_id AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())))'
    ],
    
    user_preferences: [
        // Users can view and update their own preferences
        'CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id)'
    ]
};

// Database Functions
const DATABASE_FUNCTIONS = {
    // Function to create a match when both users like each other
    create_match_on_mutual_like: `
        CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Check if the other user has also liked this user
            IF EXISTS (
                SELECT 1 FROM swipes 
                WHERE from_user = NEW.to_user 
                AND to_user = NEW.from_user 
                AND direction = 'like'
            ) AND NEW.direction = 'like' THEN
                -- Create a match (avoid duplicates)
                INSERT INTO matches (user_a, user_b)
                VALUES (
                    LEAST(NEW.from_user, NEW.to_user),
                    GREATEST(NEW.from_user, NEW.to_user)
                )
                ON CONFLICT (user_a, user_b) DO NOTHING;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `,
    
    // Trigger to automatically create matches
    create_match_trigger: `
        CREATE TRIGGER create_match_trigger
        AFTER INSERT ON swipes
        FOR EACH ROW
        EXECUTE FUNCTION create_match_on_mutual_like();
    `,
    
    // Function to get potential matches for a user
    get_potential_matches: `
        CREATE OR REPLACE FUNCTION get_potential_matches(user_id uuid, limit_count integer DEFAULT 10)
        RETURNS TABLE (
            id uuid,
            name varchar,
            age integer,
            gender varchar,
            sport_goals varchar,
            experience_level varchar,
            bio text,
            avatar varchar
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                u.id,
                u.name,
                u.age,
                u.gender,
                u.sport_goals,
                u.experience_level,
                u.bio,
                u.avatar
            FROM users u
            WHERE u.id != user_id
            AND u.id NOT IN (
                SELECT s.to_user 
                FROM swipes s 
                WHERE s.from_user = user_id
            )
            AND u.id NOT IN (
                SELECT CASE 
                    WHEN m.user_a = user_id THEN m.user_b 
                    ELSE m.user_a 
                END
                FROM matches m 
                WHERE m.user_a = user_id OR m.user_b = user_id
            )
            ORDER BY u.created_at DESC
            LIMIT limit_count;
        END;
        $$ LANGUAGE plpgsql;
    `,
    
    // Function to get user's matches
    get_user_matches: `
        CREATE OR REPLACE FUNCTION get_user_matches(user_id uuid)
        RETURNS TABLE (
            match_id uuid,
            other_user_id uuid,
            other_user_name varchar,
            other_user_avatar varchar,
            created_at timestamp with time zone
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                m.id as match_id,
                CASE 
                    WHEN m.user_a = user_id THEN m.user_b 
                    ELSE m.user_a 
                END as other_user_id,
                CASE 
                    WHEN m.user_a = user_id THEN u_b.name 
                    ELSE u_a.name 
                END as other_user_name,
                CASE 
                    WHEN m.user_a = user_id THEN u_b.avatar 
                    ELSE u_a.avatar 
                END as other_user_avatar,
                m.created_at
            FROM matches m
            LEFT JOIN users u_a ON m.user_a = u_a.id
            LEFT JOIN users u_b ON m.user_b = u_b.id
            WHERE m.user_a = user_id OR m.user_b = user_id
            ORDER BY m.created_at DESC;
        END;
        $$ LANGUAGE plpgsql;
    `
};

// Storage Configuration
const STORAGE_CONFIG = {
    buckets: [
        {
            name: 'avatars',
            public: true,
            policies: [
                'CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = \'avatars\')',
                'CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1])',
                'CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1])',
                'CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (bucket_id = \'avatars\' AND auth.uid()::text = (storage.foldername(name))[1])'
            ]
        }
    ]
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        DATABASE_SCHEMA,
        RLS_POLICIES,
        DATABASE_FUNCTIONS,
        STORAGE_CONFIG
    };
}
