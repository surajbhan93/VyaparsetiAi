export const formatResponse = ({ reply, replyScore, replyAfterHours }) => {
  return {
    success: true,
    data: {
      reply,
      replyScore,
      replyAfterHours,
    },
  };
};
