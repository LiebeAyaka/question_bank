-- 将现有数据中的 HTML 实体反转义
-- 幂等设计：已被反转义的数据中不再包含 &amp; / &lt; / &gt; / &quot; / &#39; 模式，UPDATE 无实际影响

UPDATE questions SET content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(content,
    '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', "'")
WHERE content LIKE '%&amp;%' OR content LIKE '%&lt;%' OR content LIKE '%&gt;%' OR content LIKE '%&quot;%' OR content LIKE '%&#39;%';

UPDATE questions SET answer = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(answer,
    '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', "'")
WHERE answer LIKE '%&amp;%' OR answer LIKE '%&lt;%' OR answer LIKE '%&gt;%' OR answer LIKE '%&quot;%' OR answer LIKE '%&#39;%';

UPDATE questions SET questions = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(questions,
    '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', "'")
WHERE questions LIKE '%&amp;%' OR questions LIKE '%&lt;%' OR questions LIKE '%&gt;%' OR questions LIKE '%&quot;%' OR questions LIKE '%&#39;%';

UPDATE questions SET blanks = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(blanks,
    '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', "'")
WHERE blanks LIKE '%&amp;%' OR blanks LIKE '%&lt;%' OR blanks LIKE '%&gt;%' OR blanks LIKE '%&quot;%' OR blanks LIKE '%&#39;%';

UPDATE questions SET tags = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(tags,
    '&amp;', '&'), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', "'")
WHERE tags LIKE '%&amp;%' OR tags LIKE '%&lt;%' OR tags LIKE '%&gt;%' OR tags LIKE '%&quot;%' OR tags LIKE '%&#39;%';
