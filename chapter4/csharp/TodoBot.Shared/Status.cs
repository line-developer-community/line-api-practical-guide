namespace TodoBot.Shared
{
    /// <summary>
    /// Todoステータス
    /// </summary>
    public enum Status
    {
        /// <summary>
        /// 準備中
        /// </summary>
        Ready,
        /// <summary>
        /// 実施中
        /// </summary>
        Doing,
        /// <summary>
        /// 実施済み(完了)
        /// </summary>
        Done,
        /// <summary>
        /// 取り消し済み
        /// </summary>
        Canceled
    }
}