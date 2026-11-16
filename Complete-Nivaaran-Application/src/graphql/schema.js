const { gql } = require("graphql-tag");

const typeDefs = gql`
  type User { id: ID!, name: String!, email: String!, role: String!, phone: String }
  type AuthPayload { token: String!, user: User! }
  type Room { id: ID!, room_number: String!, capacity: Int!, occupied: Int!, block_name: String!, status: String! }
  type Complaint { id: ID!, user_id: ID!, student_name: String, category: String!, title: String!, description: String!, status: String!, created_at: String! }
  type MenuItem { id: ID!, day_name: String!, meal_type: String!, items: String!, available: Boolean! }
  type Payment { id: ID!, user_id: ID!, student_name: String, description: String!, amount: Float!, status: String!, created_at: String! }
  type Notification { id: ID!, user_id: ID, title: String!, message: String!, is_read: Boolean!, created_at: String! }
  type Report { students: Int!, complaints: Int!, pendingComplaints: Int!, rooms: Int!, availableRooms: Int!, pendingPayments: Float! }

  type Query {
    me: User
    rooms: [Room!]!
    complaints: [Complaint!]!
    menu: [MenuItem!]!
    payments: [Payment!]!
    notifications: [Notification!]!
    reports: Report!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, phone: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createComplaint(category: String!, title: String!, description: String!): Complaint!
    updateComplaintStatus(id: ID!, status: String!): Complaint!
    requestRoom(roomId: ID!): Room!
    createMenuItem(day_name: String!, meal_type: String!, items: String!): MenuItem!
    createPayment(userId: ID!, description: String!, amount: Float!): Payment!
    markNotificationRead(id: ID!): Notification!
    createAnnouncement(title: String!, message: String!): Boolean!
  }
`;

module.exports = typeDefs;
